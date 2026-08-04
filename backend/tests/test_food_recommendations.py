"""
Tests for POST /api/v1/food/recommendations.
Google Places is always mocked here — no real network calls, no real key needed.
"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import get_settings  # noqa: E402
from services import google_places  # noqa: E402
from database import create_db_and_tables  # noqa: E402
import main  # noqa: E402


create_db_and_tables()  # ensure the users/transactions tables exist for the auth-route test below


BASE_PAYLOAD = {
    "budget": 500,
    "people": 2,
    "meal_type": "dinner",
    "cuisine": "italian",
    "location": "New Cairo, Cairo, Egypt",
    "latitude": None,
    "longitude": None,
    "maximum_distance_km": 5,
    "service_type": "dine-in",
    "open_now": True,
    "dietary_requirements": [],
    "preference": "cheapest",
}


def make_place(
    place_id="place_1",
    name="Example Restaurant",
    rating=4.5,
    review_count=1200,
    price_level="PRICE_LEVEL_MODERATE",
    open_now=True,
    lat=30.03,
    lng=31.49,
    business_status="OPERATIONAL",
    types=None,
):
    place = {
        "id": place_id,
        "displayName": {"text": name},
        "formattedAddress": "New Cairo, Cairo, Egypt",
        "location": {"latitude": lat, "longitude": lng},
        "googleMapsUri": f"https://maps.google.com/?q={place_id}",
        "primaryType": "italian_restaurant",
        "types": types or ["italian_restaurant", "restaurant"],
        "businessStatus": business_status,
    }
    if rating is not None:
        place["rating"] = rating
    if review_count is not None:
        place["userRatingCount"] = review_count
    if price_level is not None:
        place["priceLevel"] = price_level
    if open_now is not None:
        place["currentOpeningHours"] = {"openNow": open_now}
    return place


@pytest.fixture(autouse=True)
def _configure_settings(monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test_fake_key_for_pytest")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    monkeypatch.setenv("SECRET_KEY", "test_secret_for_pytest")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    return TestClient(main.app)


def _patch_search(monkeypatch, result=None, side_effect=None):
    async def fake_search_text(query, settings, **kwargs):
        if side_effect:
            raise side_effect
        return result or []

    monkeypatch.setattr(google_places, "search_text", fake_search_text)


def test_normal_valid_request(client, monkeypatch):
    _patch_search(monkeypatch, result=[make_place()])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["budget_per_person"] == 250
    assert len(body["recommendations"]) >= 1
    rec = body["recommendations"][0]
    assert rec["place_id"] == "place_1"
    assert rec["maps_url"].startswith("https://")
    assert rec["budget_fit"] in {
        "likely within budget", "possibly within budget", "budget unclear", "likely above budget",
    }
    assert rec["data_confidence"] in {"high", "medium", "low"}


def test_multiple_places_produce_multiple_categories(client, monkeypatch):
    places = [
        make_place(place_id="p1", name="A", rating=4.2, review_count=50, price_level="PRICE_LEVEL_INEXPENSIVE"),
        make_place(place_id="p2", name="B", rating=4.8, review_count=2000, price_level="PRICE_LEVEL_EXPENSIVE"),
        make_place(place_id="p3", name="C", rating=3.9, review_count=10, price_level="PRICE_LEVEL_MODERATE", lat=30.05, lng=31.50),
        make_place(place_id="p4", name="D", rating=4.5, review_count=400, price_level="PRICE_LEVEL_INEXPENSIVE", lat=30.10, lng=31.30),
    ]
    _patch_search(monkeypatch, result=places)
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    ids = [r["place_id"] for r in body["recommendations"]]
    assert len(ids) == len(set(ids))
    assert len(body["recommendations"]) >= 3


def test_very_small_budget_still_returns_results(client, monkeypatch):
    nasr_city_place = make_place(
        price_level="PRICE_LEVEL_INEXPENSIVE", rating=4.0, review_count=80, lat=30.0626, lng=31.3459,
    )
    _patch_search(monkeypatch, result=[nasr_city_place])
    payload = {**BASE_PAYLOAD, "budget": 100, "people": 1, "cuisine": "egyptian", "location": "Nasr City"}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["recommendations"]) >= 1
    assert any("small budget" in w.lower() or "inexpensive" in w.lower() for w in body["warnings"])


def test_large_budget(client, monkeypatch):
    _patch_search(monkeypatch, result=[make_place(price_level="PRICE_LEVEL_VERY_EXPENSIVE")])
    payload = {**BASE_PAYLOAD, "budget": 20000, "people": 4}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 200
    assert resp.json()["budget_per_person"] == 5000


def test_one_person_vs_multiple_people_changes_per_person_budget(client, monkeypatch):
    _patch_search(monkeypatch, result=[make_place()])
    one = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "budget": 300, "people": 1})
    many = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "budget": 300, "people": 6})
    assert one.json()["budget_per_person"] == 300
    assert many.json()["budget_per_person"] == 50


def test_invalid_budget_rejected(client):
    resp = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "budget": -5})
    assert resp.status_code == 422


def test_invalid_people_rejected(client):
    resp = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "people": 0})
    assert resp.status_code == 422


def test_very_large_distance_rejected(client):
    resp = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "maximum_distance_km": 500})
    assert resp.status_code == 422


def test_unknown_cairo_area_falls_back_gracefully(client, monkeypatch):
    async def fake_geocode(location_text, settings):
        return None

    monkeypatch.setattr("services.location_service.geocode_location", fake_geocode)
    _patch_search(monkeypatch, result=[make_place()])
    payload = {**BASE_PAYLOAD, "location": "Some Made Up Neighbourhood That Does Not Exist"}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["search_area"] == "Central Cairo (approximate)"
    assert any("could not precisely locate" in w.lower() for w in body["warnings"])


def test_manual_preset_area_is_resolved_without_geocoding(client, monkeypatch):
    async def fail_if_called(*args, **kwargs):
        raise AssertionError("geocoding should not be called for a known preset area")

    monkeypatch.setattr("services.location_service.geocode_location", fail_if_called)
    _patch_search(monkeypatch, result=[make_place()])
    payload = {**BASE_PAYLOAD, "location": "Maadi"}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 200
    assert resp.json()["search_area"] == "Maadi"


def test_latitude_longitude_used_directly(client, monkeypatch):
    _patch_search(monkeypatch, result=[make_place(lat=30.03, lng=31.49)])
    payload = {**BASE_PAYLOAD, "location": None, "latitude": 30.0271, "longitude": 31.4959}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 200
    assert resp.json()["recommendations"][0]["distance_km"] is not None


def test_missing_location_and_coordinates_rejected(client):
    payload = {**BASE_PAYLOAD, "location": None, "latitude": None, "longitude": None}
    resp = client.post("/api/v1/food/recommendations", json=payload)
    assert resp.status_code == 422


def test_no_google_results_returns_empty_list_not_error(client, monkeypatch):
    _patch_search(monkeypatch, result=[])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["recommendations"] == []
    assert any("no matching places" in w.lower() for w in body["warnings"])


def test_google_timeout_returns_504(client, monkeypatch):
    _patch_search(monkeypatch, side_effect=google_places.GooglePlacesTimeoutError("timeout"))
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 504


def test_invalid_api_key_returns_502(client, monkeypatch):
    _patch_search(monkeypatch, side_effect=google_places.GooglePlacesAuthError("Google Places API key is invalid or not authorized for this API."))
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 502
    assert "test_fake_key_for_pytest" not in resp.text


def test_quota_exceeded_returns_503(client, monkeypatch):
    _patch_search(monkeypatch, side_effect=google_places.GooglePlacesQuotaError("quota"))
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 503


def test_missing_api_key_returns_503(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "replace_with_your_real_key")
    get_settings.cache_clear()
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 503


def test_missing_price_level_and_rating_lowers_confidence(client, monkeypatch):
    place = make_place(rating=None, review_count=None, price_level=None)
    _patch_search(monkeypatch, result=[place])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    body = resp.json()
    rec = body["recommendations"][0]
    assert rec["budget_fit"] == "budget unclear"
    assert rec["data_confidence"] == "low"


def test_missing_review_count_still_returns_result(client, monkeypatch):
    place = make_place(rating=4.5, review_count=None)
    _patch_search(monkeypatch, result=[place])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 200
    assert len(resp.json()["recommendations"]) == 1


def test_missing_opening_hours_handled(client, monkeypatch):
    place = make_place()
    del place["currentOpeningHours"]
    _patch_search(monkeypatch, result=[place])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    assert resp.status_code == 200
    assert resp.json()["recommendations"][0]["open_now"] is None


def test_closed_restaurant_penalised_when_open_now_requested(client, monkeypatch):
    open_place = make_place(place_id="open_1", rating=4.0, review_count=50, open_now=True)
    closed_place = make_place(place_id="closed_1", rating=4.9, review_count=50, open_now=False)
    _patch_search(monkeypatch, result=[open_place, closed_place])
    resp = client.post("/api/v1/food/recommendations", json={**BASE_PAYLOAD, "open_now": True})
    body = resp.json()
    scores = {r["place_id"]: r["score"] for r in body["recommendations"]}
    assert scores["open_1"] > scores["closed_1"]


def test_five_star_two_reviews_does_not_beat_high_volume_rating(client, monkeypatch):
    from services.recommendation_engine import bayesian_rating

    hype, _ = bayesian_rating(5.0, 2)
    trusted, _ = bayesian_rating(4.6, 3000)
    assert trusted > hype


def test_duplicate_google_results_are_deduped(client, monkeypatch):
    dup = make_place(place_id="dup_1")
    _patch_search(monkeypatch, result=[dup, dict(dup)])
    resp = client.post("/api/v1/food/recommendations", json=BASE_PAYLOAD)
    body = resp.json()
    ids = [r["place_id"] for r in body["recommendations"]]
    assert ids.count("dup_1") == 1


def test_existing_auth_routes_still_work(client):
    resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert resp.status_code == 401
