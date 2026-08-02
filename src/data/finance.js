/* ==================================================================
 *  DASHBOARD DATA — swap these for your API payload
 * ================================================================== */

export const CATEGORY_COLORS = {
  "Food & Dining": "#2ebd85",
  Transport: "#7c5cff",
  Shopping: "#e8a33d",
  Entertainment: "#e5484d",
  Health: "#f06a8a",
  Utilities: "#8b95a5",
};

export const SUMMARY = {
  totalSpent: 18432.5,
  period: "July 2026",
  transactions: 42,
  avgPurchase: 438.86,
  topCategory: "Food",
  topCategoryTotal: 4890,
};

export const CATEGORY_BREAKDOWN = [
  { name: "Food & Dining", value: 27 },
  { name: "Transport", value: 12 },
  { name: "Shopping", value: 18 },
  { name: "Entertainment", value: 10 },
  { name: "Health", value: 14 },
  { name: "Utilities", value: 19 },
];

export const TIMELINE = {
  Daily: [
    { label: "1", spend: 620, avg: 620 },
    { label: "5", spend: 1180, avg: 720 },
    { label: "9", spend: 340, avg: 640 },
    { label: "13", spend: 2260, avg: 980 },
    { label: "17", spend: 780, avg: 940 },
    { label: "21", spend: 1540, avg: 1010 },
    { label: "25", spend: 460, avg: 940 },
    { label: "29", spend: 1320, avg: 1010 },
  ],
  Weekly: [
    { label: "W1", spend: 4180, avg: 4180 },
    { label: "W2", spend: 5240, avg: 4710 },
    { label: "W3", spend: 3610, avg: 4343 },
    { label: "W4", spend: 5402, avg: 4608 },
  ],
  Monthly: [
    { label: "May", spend: 16840, avg: 16840 },
    { label: "Jun", spend: 20310, avg: 18575 },
    { label: "Jul", spend: 18432, avg: 18527 },
  ],
};

export const RANGE_DATA = [
  { name: "Food", min: 85, max: 920, avg: 372 },
  { name: "Transport", min: 40, max: 640, avg: 245 },
  { name: "Shopping", min: 210, max: 2600, avg: 880 },
  { name: "Entertainment", min: 120, max: 1150, avg: 465 },
  { name: "Health", min: 180, max: 1980, avg: 720 },
  { name: "Utilities", min: 200, max: 1420, avg: 640 },
];

export const money = (n) =>
  "EGP " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Formats an ISO date ("2026-07-29") the same way across the table and modal.
export const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

// Computes the four Dashboard stat cards straight from the live
// transaction list, so adding/deleting a transaction updates them instantly.
export const deriveSummary = (transactions) => {
  const count = transactions.length;
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgPurchase = count ? totalSpent / count : 0;

  const byCategory = {};
  transactions.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  let topCategory = "—";
  let topCategoryTotal = 0;
  Object.entries(byCategory).forEach(([cat, sum]) => {
    if (sum > topCategoryTotal) {
      topCategory = cat;
      topCategoryTotal = sum;
    }
  });

  const latest = transactions.reduce(
    (latestDate, t) => (!latestDate || t.date > latestDate ? t.date : latestDate),
    null
  );
  const period = latest
    ? new Date(`${latest}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  return { totalSpent, transactions: count, avgPurchase, topCategory, topCategoryTotal, period };
};
