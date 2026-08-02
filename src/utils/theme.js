/* ==================================================================
 *  THEME + ACCENT PERSISTENCE
 *  Shared by App.jsx (applies saved prefs on every load, on whatever
 *  page the person refreshes on) and Settings.jsx (the controls that
 *  change them). Keeping this logic in one place is what makes the
 *  choice survive a refresh no matter which route you're on.
 * ================================================================== */

const THEME_KEY = "ft_theme";
const ACCENT_KEY = "ft_accent";

export const ACCENT_COLORS = {
  coral: "#EF7158",
  blue: "#3B82F6",
  green: "#22C55E",
  purple: "#8B5CF6",
};

const DEFAULT_ACCENT = ACCENT_COLORS.coral;

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getStoredAccent() {
  try {
    return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

// Applies whatever is saved to the DOM. Safe to call on every mount —
// idempotent, and cheap enough to run before first paint.
export function applyStoredTheme() {
  const theme = getStoredTheme();
  document.body.classList.toggle("dark", theme === "dark");
  return theme;
}

export function applyStoredAccent() {
  const accent = getStoredAccent();
  document.documentElement.style.setProperty("--accent", accent);
  return accent;
}

export function setTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage failures (private mode, quota) — still works in-memory
  }
}

export function setAccent(hex) {
  document.documentElement.style.setProperty("--accent", hex);
  try {
    localStorage.setItem(ACCENT_KEY, hex);
  } catch {
    // ignore storage failures
  }
}
