"""
Search-query construction, scoring, and ranking for Cairo food
recommendations.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from schemas.food import FoodRecommendationRequest, Recommendation
from services.location_service import haversine_km

SMALL_BUDGET_TERMS = [
    "koshary",
    "foul and falafel",
    "shawarma",
    "local grills",
    "sandwich shop",
    "bakery",
    "cafe",
    "street food",
    "food court",
    "takeaway restaurants",
    "local Egyptian restaurants",
]

_SERVICE_TERM = {
    "dine-in": "",
    "takeaway": "takeaway",
    "delivery": "delivery",
}


def build_search_queries(req: FoodRecommendationRequest, area_label: str, is_small_budget: bool) -> list[str]:
    meal = "" if req.meal_type == "any" else req.meal_type
    cuisine = "" if req.cuisine == "any" else req.cuisine
    service = _SERVICE_TERM.get(req.service_type, "")
    dietary = " ".join(req.dietary_requirements)

    if is_small_budget and cuisine in ("", "egyptian", "any"):
        queries = []
        for term in SMALL_BUDGET_TERMS[:6]:
            q = f"cheap {term} in {area_label} Cairo"
            if service:
                q += f" {service}"
            queries.append(q.strip())
        return queries[:3]

    parts = [p for p in [cuisine, meal, "restaurants"] if p]
    base = " ".join(parts)
    query = f"{base} in {area_label} Cairo"
    if service:
        query += f" {service}"
    if dietary:
        query += f" {dietary}"
    if is_small_budget:
        query = "affordable " + query

    queries = [query.strip()]

    if cuisine:
        alt = f"{cuisine} {('restaurants' if not meal else meal)} near {area_label} Cairo".strip()
        queries.append(alt)

    return queries[:3]


PRICE_LEVEL_BANDS = {
    "PRICE_LEVEL_FREE": (0, 30),
    "PRICE_LEVEL_INEXPENSIVE": (50, 150),
    "PRICE_LEVEL_MODERATE": (150, 350),
    "PRICE_LEVEL_EXPENSIVE": (350, 700),
    "PRICE_LEVEL_VERY_EXPENSIVE": (700, 1500),
}

PRICE_LEVEL_LABELS = {
    "PRICE_LEVEL_FREE": "free",
    "PRICE_LEVEL_INEXPENSIVE": "inexpensive",
    "PRICE_LEVEL_MODERATE": "moderate",
    "PRICE_LEVEL_EXPENSIVE": "expensive",
    "PRICE_LEVEL_VERY_EXPENSIVE": "very expensive",
    "PRICE_LEVEL_UNSPECIFIED": None,
}


def _money_to_number(money: Optional[dict[str, Any]]) -> Optional[float]:
    if not money:
        return None
    units = money.get("units")
    nanos = money.get("nanos", 0)
    if units is None:
        return None
    try:
        return float(units) + float(nanos) / 1e9
    except (TypeError, ValueError):
        return None


def budget_fit_for(
    price_level: Optional[str],
    price_min: Optional[float],
    price_max: Optional[float],
    budget_per_person: float,
) -> tuple[str, float]:
    if price_min is not None or price_max is not None:
        low = price_min if price_min is not None else price_max
        high = price_max if price_max is not None else price_min
        if high is not None and budget_per_person >= high:
            return "likely within budget", 1.0
        if low is not None and budget_per_person >= low:
            return "possibly within budget", 0.85
        return "likely above budget", 0.8

    band = PRICE_LEVEL_BANDS.get(price_level or "")
    if band:
        low, high = band
        if budget_per_person >= high * 1.05:
            return "likely within budget", 0.6
        if budget_per_person >= low:
            return "possibly within budget", 0.55
        return "likely above budget", 0.5

    return "budget unclear", 0.25


PRIOR_RATING = 3.6
PRIOR_WEIGHT = 8


def bayesian_rating(rating: Optional[float], review_count: Optional[int]) -> tuple[float, float]:
    if rating is None or review_count is None or review_count <= 0:
        return PRIOR_RATING, 0.1
    adjusted = (rating * review_count + PRIOR_RATING * PRIOR_WEIGHT) / (review_count + PRIOR_WEIGHT)
    confidence = min(review_count / 100, 1.0)
    return adjusted, max(confidence, 0.2)


BASE_WEIGHTS = {
    "budget": 0.35,
    "relevance": 0.25,
    "rating": 0.20,
    "distance": 0.15,
    "open_now": 0.05,
}

_PREFERENCE_BOOST = {
    "cheapest": "budget",
    "closest": "distance",
    "best_rated": "rating",
    "best_overall": None,
}


def weights_for_preference(preference: str) -> dict[str, float]:
    boosted_key = _PREFERENCE_BOOST.get(preference)
    if not boosted_key:
        return dict(BASE_WEIGHTS)

    weights = dict(BASE_WEIGHTS)
    boost = 0.20
    weights[boosted_key] += boost
    remaining_keys = [k for k in weights if k != boosted_key]
    remaining_total = sum(weights[k] for k in remaining_keys)
    for k in remaining_keys:
        weights[k] -= boost * (weights[k] / remaining_total)
    return weights


@dataclass
class Candidate:
    place_id: str
    name: str
    address: str
    rating: Optional[float]
    review_count: Optional[int]
    price_level: Optional[str]
    price_min: Optional[float]
    price_max: Optional[float]
    currency: Optional[str]
    open_now: Optional[bool]
    business_status: Optional[str]
    primary_type: Optional[str]
    types: list[str]
    maps_url: str
    latitude: Optional[float]
    longitude: Optional[float]
    distance_km: Optional[float] = None
    travel_time_minutes: Optional[int] = None
    distance_type: str = "straight_line"
    score: float = 0.0
    budget_fit: str = "budget unclear"
    data_confidence: str = "low"
    reason_parts: list[str] = field(default_factory=list)


def raw_place_to_candidate(place: dict[str, Any]) -> Optional[Candidate]:
    place_id = place.get("id")
    if not place_id:
        return None

    display_name = (place.get("displayName") or {}).get("text", "Unnamed place")
    location = place.get("location") or {}
    price_range = place.get("priceRange") or {}

    return Candidate(
        place_id=place_id,
        name=display_name,
        address=place.get("formattedAddress", "Address unavailable"),
        rating=place.get("rating"),
        review_count=place.get("userRatingCount"),
        price_level=place.get("priceLevel"),
        price_min=_money_to_number(price_range.get("startPrice")),
        price_max=_money_to_number(price_range.get("endPrice")),
        currency=(price_range.get("startPrice") or price_range.get("endPrice") or {}).get("currencyCode"),
        open_now=(place.get("currentOpeningHours") or {}).get("openNow"),
        business_status=place.get("businessStatus"),
        primary_type=place.get("primaryType"),
        types=place.get("types", []),
        maps_url=place.get("googleMapsUri") or f"https://www.google.com/maps/place/?q=place_id:{place_id}",
        latitude=location.get("latitude"),
        longitude=location.get("longitude"),
    )


def dedupe_candidates(candidates: list[Candidate]) -> list[Candidate]:
    seen: set[str] = set()
    out = []
    for c in candidates:
        if c.place_id in seen:
            continue
        seen.add(c.place_id)
        out.append(c)
    return out


def _relevance_score(candidate: Candidate, req: FoodRecommendationRequest) -> float:
    cuisine = req.cuisine.lower()
    haystack = " ".join([candidate.name.lower(), candidate.primary_type or "", " ".join(candidate.types)]).lower()
    if cuisine and cuisine != "any" and cuisine in haystack:
        return 1.0
    if req.meal_type != "any" and req.meal_type in haystack:
        return 0.85
    if cuisine == "any" or not cuisine:
        return 0.75
    return 0.55


def score_candidates(
    candidates: list[Candidate],
    req: FoodRecommendationRequest,
    budget_per_person: float,
) -> list[Candidate]:
    weights = weights_for_preference(req.preference)

    for c in candidates:
        budget_fit, budget_conf = budget_fit_for(c.price_level, c.price_min, c.price_max, budget_per_person)
        adjusted_rating, rating_conf = bayesian_rating(c.rating, c.review_count)

        budget_score = {
            "likely within budget": 1.0,
            "possibly within budget": 0.7,
            "budget unclear": 0.45,
            "likely above budget": 0.1,
        }[budget_fit]

        relevance_score = _relevance_score(c, req)
        rating_score = adjusted_rating / 5.0

        if c.distance_km is None:
            distance_score = 0.4
        else:
            distance_score = max(0.0, 1 - (c.distance_km / max(req.maximum_distance_km, 0.1)))

        if req.open_now:
            open_score = 1.0 if c.open_now else (0.15 if c.open_now is False else 0.5)
        else:
            open_score = 1.0 if c.open_now in (True, None) else 0.7

        total = (
            weights["budget"] * budget_score
            + weights["relevance"] * relevance_score
            + weights["rating"] * rating_score
            + weights["distance"] * distance_score
            + weights["open_now"] * open_score
        )

        if req.open_now and c.open_now is False:
            total *= 0.55

        if c.business_status == "CLOSED_PERMANENTLY":
            total *= 0.05

        c.score = round(total * 100, 1)
        c.budget_fit = budget_fit

        overall_confidence = (budget_conf + rating_conf) / 2
        if c.price_level is None and c.price_min is None:
            overall_confidence -= 0.15
        if c.rating is None:
            overall_confidence -= 0.15
        overall_confidence = max(0.0, min(1.0, overall_confidence))

        if overall_confidence >= 0.65:
            c.data_confidence = "high"
        elif overall_confidence >= 0.35:
            c.data_confidence = "medium"
        else:
            c.data_confidence = "low"

        reasons = []
        if relevance_score >= 0.85:
            reasons.append("matches your cuisine/meal choice")
        if c.distance_km is not None and c.distance_km <= req.maximum_distance_km:
            reasons.append(f"within your {req.maximum_distance_km:g} km range")
        if budget_fit in ("likely within budget", "possibly within budget"):
            reasons.append("fits your stated budget based on available price data")
        if c.review_count and c.review_count >= 100:
            reasons.append("has strong review confidence")
        if req.open_now and c.open_now:
            reasons.append("is currently open")
        if not reasons:
            reasons.append("is one of the closest overall matches for your criteria")
        c.reason_parts = reasons

    return candidates


def select_categories(candidates: list[Candidate], max_results: int = 5) -> list[tuple[str, Candidate]]:
    if not candidates:
        return []

    by_score = sorted(candidates, key=lambda c: c.score, reverse=True)
    chosen: list[tuple[str, Candidate]] = []
    used_ids: set[str] = set()

    def take(category: str, pool: list[Candidate]) -> None:
        for c in pool:
            if c.place_id not in used_ids:
                chosen.append((category, c))
                used_ids.add(c.place_id)
                return

    take("best_overall", by_score)

    cheapest_pool = sorted(
        candidates,
        key=lambda c: (0 if c.budget_fit == "likely within budget" else 1 if c.budget_fit == "possibly within budget" else 2, -c.score),
    )
    take("cheapest", cheapest_pool)

    best_rated_pool = sorted(candidates, key=lambda c: ((c.rating or 0) * min((c.review_count or 0), 500), c.score), reverse=True)
    take("best_rated", best_rated_pool)

    closest_pool = sorted(candidates, key=lambda c: (c.distance_km if c.distance_km is not None else 999, -c.score))
    take("closest", closest_pool)

    take("alternative", by_score)

    return chosen[:max_results]


def attach_distances(candidates: list[Candidate], origin_lat: float, origin_lng: float) -> None:
    for c in candidates:
        if c.latitude is not None and c.longitude is not None:
            c.distance_km = round(haversine_km(origin_lat, origin_lng, c.latitude, c.longitude), 2)


def apply_route_matrix(candidates: list[Candidate], matrix: dict[int, dict[str, Any]], index_map: dict[int, str]) -> None:
    by_id = {c.place_id: c for c in candidates}
    for idx, place_id in index_map.items():
        c = by_id.get(place_id)
        result = matrix.get(idx)
        if not c or not result:
            continue
        if result.get("distance_meters") is not None:
            c.distance_km = round(result["distance_meters"] / 1000, 2)
            c.distance_type = "route"
        if result.get("duration_seconds") is not None:
            c.travel_time_minutes = round(result["duration_seconds"] / 60)


def to_recommendation(category: str, c: Candidate, req: FoodRecommendationRequest) -> Recommendation:
    cuisine_label = req.cuisine.title() if req.cuisine != "any" else (c.primary_type or "Restaurant").replace("_", " ").title()
    reason = "This place " + ", ".join(c.reason_parts) + "."
    return Recommendation(
        category=category,
        place_id=c.place_id,
        name=c.name,
        address=c.address,
        area=req.location or "Cairo",
        cuisine=cuisine_label,
        rating=c.rating,
        review_count=c.review_count,
        price_level=PRICE_LEVEL_LABELS.get(c.price_level or "", None) if c.price_level else None,
        price_range_min=c.price_min,
        price_range_max=c.price_max,
        currency=c.currency,
        open_now=c.open_now,
        distance_km=c.distance_km,
        distance_type=c.distance_type,
        travel_time_minutes=c.travel_time_minutes,
        maps_url=c.maps_url,
        reason=reason,
        budget_fit=c.budget_fit,
        data_confidence=c.data_confidence,
        score=c.score,
    )
