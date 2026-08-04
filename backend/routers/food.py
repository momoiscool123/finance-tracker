"""
POST /api/v1/food/recommendations

Orchestrates: location resolution -> query construction -> Google Places
Text Search -> distance calculation -> scoring/ranking -> response shaping.
"""

import logging

from fastapi import APIRouter, HTTPException

from config import get_settings
from schemas.food import FoodRecommendationRequest, FoodRecommendationResponse
from services import google_places, location_service, recommendation_engine

logger = logging.getLogger("food.router")

router = APIRouter(prefix="/api/v1/food", tags=["food"])

MAX_RESULT_COUNT_PER_QUERY = 12
FALLBACK_DISTANCE_MULTIPLIER = 1.6


@router.post("/recommendations", response_model=FoodRecommendationResponse)
async def get_recommendations(payload: FoodRecommendationRequest) -> FoodRecommendationResponse:
    settings = get_settings()

    if not settings.has_real_api_key:
        raise HTTPException(
            status_code=503,
            detail="The restaurant recommendation service is not configured yet (missing Google API key).",
        )

    warnings: list[str] = []
    budget_per_person = round(payload.budget / payload.people, 2)
    is_small_budget = budget_per_person < settings.small_budget_threshold_egp

    resolved = await location_service.resolve_location(
        payload.location, payload.latitude, payload.longitude, settings
    )
    if resolved.source == "fallback":
        warnings.append(
            f"Could not precisely locate '{payload.location}'. Using central Cairo as a reference point."
        )

    queries = recommendation_engine.build_search_queries(payload, resolved.label, is_small_budget)
    radius_m = payload.maximum_distance_km * 1000

    raw_places: list[dict] = []
    try:
        for query in queries:
            places = await google_places.search_text(
                query,
                settings,
                lat=resolved.latitude,
                lng=resolved.longitude,
                radius_m=radius_m,
                max_result_count=MAX_RESULT_COUNT_PER_QUERY,
            )
            raw_places.extend(places)
    except google_places.GooglePlacesAuthError as exc:
        logger.error("Google Places auth failure")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except google_places.GooglePlacesQuotaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except google_places.GooglePlacesTimeoutError as exc:
        raise HTTPException(status_code=504, detail="The restaurant search timed out. Please try again.") from exc
    except google_places.GooglePlacesUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    candidates = [recommendation_engine.raw_place_to_candidate(p) for p in raw_places]
    candidates = [c for c in candidates if c is not None]
    candidates = recommendation_engine.dedupe_candidates(candidates)

    if not candidates:
        return FoodRecommendationResponse(
            budget_per_person=budget_per_person,
            search_area=resolved.label,
            warnings=warnings + ["No matching places were found. Try a wider distance or a different area/cuisine."],
            recommendations=[],
        )

    recommendation_engine.attach_distances(candidates, resolved.latitude, resolved.longitude)

    if settings.enable_routes_api:
        indexed = [(i, c) for i, c in enumerate(candidates) if c.latitude is not None and c.longitude is not None]
        if indexed:
            index_map = {i: c.place_id for i, c in indexed}
            destinations = [(c.latitude, c.longitude) for _, c in indexed]
            matrix = await google_places.compute_route_matrix(
                resolved.latitude, resolved.longitude, destinations, settings
            )
            recommendation_engine.apply_route_matrix(candidates, matrix, index_map)

    within_range = [c for c in candidates if c.distance_km is None or c.distance_km <= payload.maximum_distance_km]

    relaxed_note = None
    if len(within_range) < 3 and len(candidates) > len(within_range):
        relaxed_km = payload.maximum_distance_km * FALLBACK_DISTANCE_MULTIPLIER
        within_range = [c for c in candidates if c.distance_km is None or c.distance_km <= relaxed_km]
        relaxed_note = (
            f"Few matches within {payload.maximum_distance_km:g} km, so the distance limit was "
            f"relaxed to about {relaxed_km:g} km to give you enough options."
        )

    scored = recommendation_engine.score_candidates(within_range, payload, budget_per_person)
    selected = recommendation_engine.select_categories(scored, max_results=5)

    if not selected:
        return FoodRecommendationResponse(
            budget_per_person=budget_per_person,
            search_area=resolved.label,
            relaxed_note=relaxed_note,
            warnings=warnings + ["No matching places were found within range. Try a wider distance."],
            recommendations=[],
        )

    recommendations = [recommendation_engine.to_recommendation(cat, c, payload) for cat, c in selected]

    if is_small_budget:
        warnings.append(
            "This is a small budget search — exact menu prices are usually unavailable, so inexpensive "
            "local options (koshary, foul, shawarma, grills, bakeries, cafes) were prioritised."
        )

    return FoodRecommendationResponse(
        budget_per_person=budget_per_person,
        search_area=resolved.label,
        relaxed_note=relaxed_note,
        warnings=warnings,
        recommendations=recommendations,
    )
