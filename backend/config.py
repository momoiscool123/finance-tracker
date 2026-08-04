"""
Configuration for the food recommendation feature.

Reads settings from environment variables / backend/.env via pydantic-settings.
The Google API key is only ever read here, on the backend. It must never be
forwarded to the frontend, logged, or included in any response body.

This lives alongside the project's existing SECRET_KEY (used for JWT auth) in
the same backend/.env file -- both are read independently.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    google_places_api_key: str = Field(default="replace_with_your_real_key")

    cors_origins_raw: str = Field(default="http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")

    enable_routes_api: bool = Field(default=False, alias="ENABLE_ROUTES_API")

    request_timeout_seconds: float = Field(default=8.0, alias="REQUEST_TIMEOUT_SECONDS")

    small_budget_threshold_egp: float = Field(default=120.0, alias="SMALL_BUDGET_THRESHOLD_EGP")

    @field_validator("google_places_api_key")
    @classmethod
    def _warn_placeholder(cls, value: str) -> str:
        return value

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def has_real_api_key(self) -> bool:
        return bool(self.google_places_api_key) and self.google_places_api_key != "replace_with_your_real_key"


@lru_cache
def get_settings() -> Settings:
    return Settings()
