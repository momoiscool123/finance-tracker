/* ==================================================================
 *  CHAT DATA — answers are computed from the user's live transactions
 *  (passed in from the TransactionContext), not canned text.
 * ================================================================== */
import { money, formatDate } from "./finance";

export const OPENING_MESSAGES = [
  {
    id: 1,
    from: "bot",
    text: "Hi — I can help you make sense of your spending. Ask about your total, a category, your biggest purchase, or how to spend smarter.",
  },
];

export const SUGGESTIONS = [
  "Where did most of my money go?",
  "What was my biggest purchase?",
  "How can I spend smarter? 💡",
  "Where should I eat? 🍽️",
];

// ---- small helpers over the live transaction list --------------------
const totalOf = (txns) => txns.reduce((sum, t) => sum + t.amount, 0);

const sumByCategory = (txns) => {
  const map = {};
  txns.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return map;
};

const sumByMonth = (txns) => {
  const map = {};
  txns.forEach((t) => {
    const key = (t.date || "").slice(0, 7); // "YYYY-MM"
    if (key) map[key] = (map[key] || 0) + t.amount;
  });
  return map;
};

const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

// Find a category the user named in their message (e.g. "food", "shopping").
const findCategory = (text, categories) =>
  categories.find((c) => text.includes(c.toLowerCase().split(" ")[0]));

// General money-management tips, lightly personalised with the user's own
// top category. Kept to well-known budgeting habits — not investment or
// professional financial advice.
const spendingAdvice = (transactions) => {
  const tips = [
    "• Follow the 50/30/20 guide: ~50% on needs, ~30% on wants, ~20% saved.",
    "• Set a monthly spending limit on the Bank & limits page — I'll nudge you as you get close.",
    "• Pay yourself first: move money to savings at the start of the month, before spending.",
    "• Review recurring subscriptions and cancel any you don't really use.",
    "• Sleep on big purchases — wait a day before buying to skip impulse spends.",
  ];

  let personal;
  if (transactions.length) {
    const total = totalOf(transactions);
    const [topName, topAmount] = Object.entries(sumByCategory(transactions)).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const pct = Math.round((topAmount / total) * 100);
    personal = `Your biggest category right now is ${topName} at ${pct}% of your ${money(
      total
    )} — a good first place to look if you want to cut back.`;
  } else {
    personal = "Log a few transactions and I can point out exactly where to trim.";
  }

  return (
    "Here are some solid habits for spending wisely:\n" +
    tips.join("\n") +
    `\n\n${personal}\n\n(General budgeting tips — not professional financial advice.)`
  );
};

/**
 * Build a reply from the real transactions.
 * @param {string} text        the user's message
 * @param {Array}  transactions live rows: { merchant, amount, category, date }
 */
export const replyTo = (text, transactions = []) => {
  const t = text.toLowerCase();

  // Spending advice / tips — checked first (so "how should I SPEND" isn't
  // caught by the total-spent rule) and works with or without data.
  if (
    /advice|advise|\btips?\b|how (should|can|do|to) (i )?(spend|save|budget)|save (money|more)|spend (smarter|better|less|wisely)|cut (back|down)|reduce.*spend|best way|smarter|budgeting/.test(
      t
    )
  ) {
    return spendingAdvice(transactions);
  }

  if (!transactions.length) {
    return "You haven't logged any transactions yet. Add one and I'll break down your spending for you.";
  }

  const total = totalOf(transactions);
  const categories = sumByCategory(transactions);
  const rankedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const namedCategory = findCategory(t, Object.keys(categories));

  // Biggest / most expensive purchase (optionally within a named category).
  if (/biggest|largest|highest|expensive/.test(t) && !/categor/.test(t)) {
    const scope = namedCategory
      ? transactions.filter((x) => x.category === namedCategory)
      : transactions;
    const max = scope.reduce((a, b) => (b.amount > a.amount ? b : a));
    return `Your biggest purchase${namedCategory ? ` in ${namedCategory}` : ""} was ${money(
      max.amount
    )} at ${max.merchant} on ${formatDate(max.date)}, filed under ${max.category}.`;
  }

  // Spending in a specific category the user named.
  if (namedCategory && /spend|spent|much|category|on\b/.test(t)) {
    const amount = categories[namedCategory];
    const pct = Math.round((amount / total) * 100);
    const count = transactions.filter((x) => x.category === namedCategory).length;
    return `You spent ${money(amount)} on ${namedCategory} across ${count} transaction${
      count === 1 ? "" : "s"
    } — that's ${pct}% of your ${money(total)} total.`;
  }

  // Compare the two most recent months.
  if (/compare|versus|\bvs\b|month/.test(t)) {
    const months = sumByMonth(transactions);
    const keys = Object.keys(months).sort();
    if (keys.length >= 2) {
      const [prev, last] = [keys[keys.length - 2], keys[keys.length - 1]];
      const diff = months[last] - months[prev];
      const direction = diff === 0 ? "flat" : diff > 0 ? "up" : "down";
      if (direction === "flat") {
        return `${monthLabel(last)} and ${monthLabel(prev)} are level at ${money(months[last])} each.`;
      }
      return `${monthLabel(last)} is ${direction} ${money(Math.abs(diff))} vs ${monthLabel(
        prev
      )} (${money(months[last])} vs ${money(months[prev])}).`;
    }
    return `You've only got spending in one month so far — ${monthLabel(keys[0])}: ${money(
      months[keys[0]]
    )}. Add another month and I can compare them.`;
  }

  // Average / per-transaction.
  if (/average|avg|per transaction|typical/.test(t)) {
    return `Your average purchase is ${money(total / transactions.length)} across ${
      transactions.length
    } transactions.`;
  }

  // How many transactions.
  if (/how many|number of|count\b/.test(t)) {
    return `You have ${transactions.length} transaction${
      transactions.length === 1 ? "" : "s"
    } logged, totalling ${money(total)}.`;
  }

  // Where did most of my money go / top category.
  if (/where|most|top|category|go\b/.test(t)) {
    const [name, amount] = rankedCats[0];
    const pct = Math.round((amount / total) * 100);
    return `Most of your money went to ${name}: ${money(amount)} — ${pct}% of your ${money(
      total
    )} total.`;
  }

  // Total spent.
  if (/total|spent|spend|altogether|overall|so far/.test(t)) {
    return `You've spent ${money(total)} across ${transactions.length} transaction${
      transactions.length === 1 ? "" : "s"
    }.`;
  }

  // Fallback — a quick snapshot plus a nudge toward answerable questions.
  const [topName, topAmount] = rankedCats[0];
  return `Here's the quick picture: ${money(total)} across ${
    transactions.length
  } transactions, led by ${topName} (${money(
    topAmount
  )}). Ask me about a category, your biggest purchase, or your total.`;
};
