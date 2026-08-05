// Small helper for talking to the FastAPI backend.
// In production you'd move this URL into an env var (import.meta.env.VITE_API_URL).
const API_BASE = "http://localhost:8000";

// Attach the stored JWT so protected endpoints know who's calling.
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // FastAPI returns errors as { detail: "..." }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong. Please try again.");
  }
  return data;
}

// --- auth ---
// POST /auth/register -> { user_id }
export function registerUser({ email, name, password }) {
  return request("/auth/register", { method: "POST", body: { email, name, password } });
}

// POST /auth/login -> { access_token, token_type }
export function loginUser({ email, password }) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

// GET /auth/me -> { user_id, name, email } for the logged-in user
export function getCurrentUser() {
  return request("/auth/me");
}

// --- transactions (protected — need the token) ---
// POST /transactions -> the created transaction (with items)
export function createTransaction(payload) {
  return request("/transactions", { method: "POST", body: payload });
}

// GET /transactions -> the logged-in user's transactions
export function listTransactions() {
  return request("/transactions");
}

// DELETE /transactions/{id} -> 204 No Content
export function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: "DELETE" });
}

// POST /categorize -> { category, confidence, source }
// Guess a category from a merchant name (used to pre-fill the Add form).
export function categorizeMerchant(merchant) {
  return request("/categorize", { method: "POST", body: { merchant } });
}

// --- recurring subscriptions ---
export function listRecurringExpenses() {
  return request("/recurring-expenses");
}

export function createRecurringExpense(payload) {
  return request("/recurring-expenses", { method: "POST", body: payload });
}

export function deleteRecurringExpense(id) {
  return request(`/recurring-expenses/${id}`, { method: "DELETE" });
}

// --- reusable one-tap expenses (fuel, parking, etc.) ---
export function listQuickExpenses() {
  return request("/quick-expenses");
}

export function createQuickExpense(payload) {
  return request("/quick-expenses", { method: "POST", body: payload });
}

export function logQuickExpense(id) {
  return request(`/quick-expenses/${id}/log`, { method: "POST" });
}

export function deleteQuickExpense(id) {
  return request(`/quick-expenses/${id}`, { method: "DELETE" });
}
