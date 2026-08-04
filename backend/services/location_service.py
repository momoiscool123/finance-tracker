"""
Location resolution for Cairo-area searches.
"""

import logging
import math
from dataclasses import dataclass
from typing import Literal, Optional

import httpx

from config import Settings

logger = logging.getLogger("food.location")

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

CAIRO_AREAS: dict[str, tuple[float, float]] = {
    "new cairo": (30.0271, 31.4959),
    "fifth settlement": (30.0286, 31.4219),
    "nasr city": (30.0626, 31.3459),
    "heliopolis": (30.0909, 31.3269),
    "maadi": (29.9602, 31.2569),
    "zamalek": (30.0616, 31.2197),
    "downtown cairo": (30.0459, 31.2402),
    "dokki": (30.0378, 31.2126),
    "mohandessin": (30.0561, 31.2003),
    "sheikh zayed": (30.0778, 30.9757),
    "6th of october": (29.9660, 30.9232),
    "6 october": (29.9660, 30.9232),
    "garden city": (30.0333, 31.2306),
    "rehab": (30.0592, 31.4913),
    "madinaty": (30.1046, 31.6396),
    "shorouk": (30.1281, 31.6122),
    "el shorouk": (30.1281, 31.6122),
    "mokattam": (29.9870, 31.3049),
    "muqattam": (29.9870, 31.3049),
    "giza": (30.0131, 31.2089),
}

CAIRO_CITY_CENTER = (30.0444, 31.2357)


@dataclass
class ResolvedLocation:
    latitude: float
    longitude: float
    label: str
    source: Literal["coordinates", "preset", "geocoded", "fallback"] = "preset"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def match_preset_area(location_text: str) -> Optional[tuple[str, tuple[float, float]]]:
    cleaned = location_text.strip().lower()
    if cleaned in CAIRO_AREAS:
        return cleaned, CAIRO_AREAS[cleaned]
    for key, coords in CAIRO_AREAS.items():
        if key in cleaned or cleaned in key:
            return key, coords
    return None


async def geocode_location(location_text: str, settings: Settings) -> Optional[tuple[float, float, str]]:
    if not settings.has_real_api_key:
        return None

    params = {
        "address": f"{location_text}, Cairo, Egypt",
        "components": "country:EG",
        "region": "eg",
        "key": settings.google_places_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            resp = await client.get(GEOCODE_URL, params=params)
    except httpx.TimeoutException:
        logger.warning("Geocoding request timed out")
        return None
    except httpx.HTTPError as exc:
        logger.warning("Geocoding request failed: %s", exc.__class__.__name__)
        return None

    if resp.status_code != 200:
        logger.warning("Geocoding HTTP error: status=%s", resp.status_code)
        return None

    payload = resp.json()
    status = payload.get("status")
    if status != "OK" or not payload.get("results"):
        logger.info("Geocoding returned no usable result: status=%s", status)
        return None

    top = payload["results"][0]
    loc = top["geometry"]["location"]
    formatted = top.get("formatted_address", location_text)
    return loc["lat"], loc["lng"], formatted


async def resolve_location(
    location_text: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    settings: Settings,
) -> ResolvedLocation:
    if latitude is not None and longitude is not None:
        return ResolvedLocation(latitude, longitude, location_text or "your location", "coordinates")

    if location_text:
        preset = match_preset_area(location_text)
        if preset:
            key, (lat, lng) = preset
            return ResolvedLocation(lat, lng, key.title(), "preset")

        geocoded = await geocode_location(location_text, settings)
        if geocoded:
            lat, lng, formatted = geocoded
            return ResolvedLocation(lat, lng, formatted, "geocoded")

    lat, lng = CAIRO_CITY_CENTER
    return ResolvedLocation(lat, lng, "Central Cairo (approximate)", "fallback")
