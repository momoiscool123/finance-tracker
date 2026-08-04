"""
Request/response models for the Cairo food recommendation feature.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

MealType = Literal[
    "breakfast", "lunch", "dinner", "dessert", "coffee", "fast food", "any",
]

ServiceType = Literal["dine-in", "takeaway", "delivery"]

Preference = Literal["cheapest", "closest", "best_rated", "best_overall"]

_PREFERENCE_ALIASES = {
    "cheapest": "cheapest",
    "cheap": "cheapest",
    "closest": "closest",
    "nearest": "closest",
    "best-rated": "best_rated",
    "best rated": "best_rated",
    "best_rated": "best_rated",
    "top rated": "best_rated",
    "best overall match": "best_overall",
    "best overall": "best_overall",
    "best_overall": "best_overall",
    "overall": "best_overall",
}

_MEAL_ALIASES = {
    "breakfast": "breakfast",
    "brunch": "breakfast",
    "lunch": "lunch",
    "dinner": "dinner",
    "supper": "dinner",
    "dessert": "dessert",
    "sweet": "dessert",
    "coffee": "coffee",
    "cafe": "coffee",
    "fast food": "fast food",
    "fastfood": "fast food",
    "any": "any",
    "anything": "any",
    "any meal": "any",
}


class FoodRecommendationRequest(BaseModel):
    budget: float = Field(..., gt=0, le=200000, description="Total food budget in EGP")
    people: int = Field(..., ge=1, le=50)
    meal_type: str = Field(default="any")
    cuisine: str = Field(default="any")
    location: Optional[str] = Field(default=None, max_length=200)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    maximum_distance_km: float = Field(default=5, gt=0, le=50)
    service_type: ServiceType = Field(default="dine-in")
    open_now: bool = Field(default=False)
    dietary_requirements: List[str] = Field(default_factory=list)
    preference: str = Field(default="best_overall")

    @field_validator("meal_type")
    @classmethod
    def _normalise_meal_type(cls, value: str) -> str:
        cleaned = (value or "any").strip().lower()
        return _MEAL_ALIASES.get(cleaned, cleaned or "any")

    @field_validator("cuisine")
    @classmethod
    def _normalise_cuisine(cls, value: str) -> str:
        cleaned = (value or "any").strip().lower()
        return cleaned or "any"

    @field_validator("location")
    @classmethod
    def _normalise_location(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("dietary_requirements")
    @classmethod
    def _normalise_dietary(cls, value: List[str]) -> List[str]:
        cleaned = [v.strip().lower() for v in value if v and v.strip()]
        seen = set()
        out = []
        for item in cleaned:
            if item not in seen:
                seen.add(item)
                out.append(item)
        return out

    @field_validator("preference")
    @classmethod
    def _normalise_preference(cls, value: str) -> str:
        cleaned = (value or "best_overall").strip().lower()
        return _PREFERENCE_ALIASES.get(cleaned, "best_overall")

    @model_validator(mode="after")
    def _require_location_or_coordinates(self) -> "FoodRecommendationRequest":
        has_coords = self.latitude is not None and self.longitude is not None
        if not has_coords and not self.location:
            raise ValueError("Provide either 'location' or both 'latitude' and 'longitude'.")
        return self


class Recommendation(BaseModel):
    category: Literal["best_overall", "cheapest", "best_rated", "closest", "alternative"]
    place_id: str
    name: str
    address: str
    area: str
    cuisine: str
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[str] = None
    price_range_min: Optional[float] = None
    price_range_max: Optional[float] = None
    currency: Optional[str] = None
    open_now: Optional[bool] = None
    distance_km: Optional[float] = None
    distance_type: Literal["straight_line", "route"] = "straight_line"
    travel_time_minutes: Optional[int] = None
    maps_url: str
    reason: str
    budget_fit: Literal[
        "likely within budget", "possibly within budget", "budget unclear", "likely above budget",
    ]
    data_confidence: Literal["high", "medium", "low"]
    score: float


class FoodRecommendationResponse(BaseModel):
    budget_per_person: float
    price_information_note: str = (
        "Affordability is estimated from available Google price information. "
        "Exact menu prices may not be available."
    )
    search_area: str
    relaxed_note: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[Recommendation] = Field(default_factory=list)
