/* ==================================================================
 *  SEED TRANSACTIONS — starting data, replaced/extended by whatever
 *  the person adds through the "Add Transaction" modal. Persisted
 *  to localStorage after the first change (see TransactionContext).
 *  `category` values must match the keys in CATEGORY_COLORS (finance.js)
 * ================================================================== */

export const SEED_TRANSACTIONS = [
  { id: 1, date: "2026-07-29", merchant: "Northgate Home", category: "Shopping", amount: 2580.0, note: "" },
  { id: 2, date: "2026-07-27", merchant: "Cairo Metro", category: "Transport", amount: 45.0, note: "" },
  { id: 3, date: "2026-07-25", merchant: "Sunrise Café", category: "Food & Dining", amount: 186.5, note: "" },
  { id: 4, date: "2026-07-24", merchant: "CityPharm", category: "Health", amount: 720.0, note: "" },
  { id: 5, date: "2026-07-22", merchant: "Nile Cinema", category: "Entertainment", amount: 340.0, note: "" },
  { id: 6, date: "2026-07-21", merchant: "GreenGrocer", category: "Food & Dining", amount: 412.75, note: "" },
  { id: 7, date: "2026-07-19", merchant: "Utility Board", category: "Utilities", amount: 640.0, note: "" },
  { id: 8, date: "2026-07-17", merchant: "Uber", category: "Transport", amount: 128.4, note: "" },
  { id: 9, date: "2026-07-15", merchant: "Mall of Egypt", category: "Shopping", amount: 1290.0, note: "" },
  { id: 10, date: "2026-07-12", merchant: "FitLife Gym", category: "Health", amount: 550.0, note: "" },
  { id: 11, date: "2026-07-09", merchant: "StreamPlus", category: "Entertainment", amount: 199.0, note: "" },
  { id: 12, date: "2026-07-05", merchant: "Corner Diner", category: "Food & Dining", amount: 275.25, note: "" },
];
