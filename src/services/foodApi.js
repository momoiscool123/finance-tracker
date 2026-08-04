/* ==================================================================
 *  Food recommendation API client
 *  Talks to FastAPI only. No Google key ever touches this file.
 * ================================================================== */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function fetchFoodRecommendations(payload, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/food/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Could not reach the recommendation service. Is the backend running?");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no JSON body — fall through to status-based message
  }

  if (!response.ok) {
    const detail = data?.detail;
    if (response.status === 422) {
      throw new Error("Some of the details you gave don't look valid. Let's try again.");
    }
    if (response.status === 503) {
      throw new Error(detail || "The recommendation service is temporarily unavailable. Please try again shortly.");
    }
    if (response.status === 504) {
      throw new Error("The restaurant search took too long. Please try again.");
    }
    throw new Error(detail || "Something went wrong while searching for restaurants.");
  }

  return data;
}

export function getBrowserLocation({ timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: "unsupported", message: "Your browser doesn't support location sharing." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject({ code: "denied", message: "Location permission was denied." });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject({ code: "unavailable", message: "Your location is currently unavailable." });
        } else if (error.code === error.TIMEOUT) {
          reject({ code: "timeout", message: "Getting your location took too long." });
        } else {
          reject({ code: "unknown", message: "Could not get your location." });
        }
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
