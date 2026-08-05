import { useEffect, useState } from "react";
import { getCurrentUser } from "./api";

const USER_KEY = "user";

// Read the cached user (stored at login) from localStorage.
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

// Fetch the current user from the backend and cache it. Call this right after login.
export async function loadUser() {
  const user = await getCurrentUser(); // GET /auth/me (uses the stored token)
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

// Clear the whole session on sign out.
export function signOut() {
  localStorage.removeItem("token");
  localStorage.removeItem(USER_KEY);
}

// Hook for components: returns the current user's { name, email, ... }.
// Uses the cached copy, and fetches it if there's a token but no cache yet
// (e.g. after a page refresh).
export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    if (!user && localStorage.getItem("token")) {
      getCurrentUser()
        .then((u) => {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          setUser(u);
        })
        .catch(() => {
          /* token missing/expired — leave user null and fall back to defaults */
        });
    }
  }, [user]);

  return user;
}
