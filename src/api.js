// Small helper for talking to the FastAPI backend.
// In production you'd move this URL into an env var (import.meta.env.VITE_API_URL).
const API_BASE = "http://localhost:8000";

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // FastAPI returns errors as { detail: "..." }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong. Please try again.");
  }
  return data;
}

// POST /auth/register -> { user_id }
export function registerUser({ email, name, password }) {
  return postJSON("/auth/register", { email, name, password });
}

// POST /auth/login -> { access_token, token_type }
export function loginUser({ email, password }) {
  return postJSON("/auth/login", { email, password });
}
