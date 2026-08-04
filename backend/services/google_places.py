"""
Thin async client around Places API (New) Text Search, and the optional
Routes API route matrix. Only the smallest field mask needed is requested.
The Google API key is read from Settings and attached as a request header;
it is never logged and never included in anything returned to the caller.
"""

import logging
from typing import Any, Optional

import httpx

from config import Settings

logger = logging.getLogger("food.google_places")

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
ROUTE_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.priceRange",
        "places.currentOpeningHours.openNow",
        "places.businessStatus",
        "places.primaryType",
        "places.types",
        "places.googleMapsUri",
    ]
)


class GooglePlacesError(Exception):
    pass


class GooglePlacesTimeoutError(GooglePlacesError):
    pass


class GooglePlacesAuthError(GooglePlacesError):
    pass


class GooglePlacesQuotaError(GooglePlacesError):
    pass


class GooglePlacesUpstreamError(GooglePlacesError):
    pass


def _headers(settings: Settings) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }


def _raise_for_status(status_code: int, body: dict[str, Any]) -> None:
    if status_code == 200:
        return

    error = body.get("error", {}) if isinstance(body, dict) else {}
    google_status = error.get("status", "")

    if status_code in (401, 403) or google_status in ("PERMISSION_DENIED", "UNAUTHENTICATED"):
        logger.error("Google Places auth error: http=%s status=%s", status_code, google_status)
        raise GooglePlacesAuthError("Google Places API key is invalid or not authorized for this API.")

    if status_code == 429 or google_status == "RESOURCE_EXHAUSTED":
        logger.warning("Google Places quota exceeded: http=%s", status_code)
        raise GooglePlacesQuotaError("Google Places API quota exceeded.")

    logger.error("Google Places upstream error: http=%s status=%s", status_code, google_status)
    raise GooglePlacesUpstreamError(f"Google Places API returned an error (status {status_code}).")


async def search_text(
    query: str,
    settings: Settings,
    *,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_m: Optional[float] = None,
    max_result_count: int = 12,
) -> list[dict[str, Any]]:
    body: dict[str, Any] = {
        "textQuery": query,
        "maxResultCount": max_result_count,
        "languageCode": "en",
        "regionCode": "EG",
    }
    if lat is not None and lng is not None and radius_m:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": min(radius_m, 50000),
            }
        }

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            resp = await client.post(TEXT_SEARCH_URL, json=body, headers=_headers(settings))
    except httpx.TimeoutException as exc:
        logger.warning("Places Text Search timed out")
        raise GooglePlacesTimeoutError("Google Places API request timed out.") from exc
    except httpx.HTTPError as exc:
        logger.warning("Places Text Search transport error: %s", exc.__class__.__name__)
        raise GooglePlacesUpstreamError("Could not reach Google Places API.") from exc

    try:
        payload = resp.json()
    except ValueError:
        payload = {}

    _raise_for_status(resp.status_code, payload)
    return payload.get("places", [])


async def compute_route_matrix(
    origin_lat: float,
    origin_lng: float,
    destinations: list[tuple[float, float]],
    settings: Settings,
) -> dict[int, dict[str, Any]]:
    if not destinations:
        return {}

    body = {
        "origins": [
            {"waypoint": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lng}}}}
        ],
        "destinations": [
            {"waypoint": {"location": {"latLng": {"latitude": lat, "longitude": lng}}}}
            for lat, lng in destinations
        ],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_UNAWARE",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration,condition",
    }
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            resp = await client.post(ROUTE_MATRIX_URL, json=body, headers=headers)
        if resp.status_code != 200:
            logger.warning("Route matrix request failed: http=%s", resp.status_code)
            return {}
        rows = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Route matrix request error: %s", exc.__class__.__name__)
        return {}

    results: dict[int, dict[str, Any]] = {}
    for row in rows if isinstance(rows, list) else []:
        if row.get("condition") != "ROUTE_EXISTS":
            continue
        idx = row.get("destinationIndex", 0)
        duration_raw = row.get("duration", "0s")
        seconds = int(str(duration_raw).rstrip("s") or 0)
        results[idx] = {
            "distance_meters": row.get("distanceMeters"),
            "duration_seconds": seconds,
        }
    return results
