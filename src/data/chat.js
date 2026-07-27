/* ==================================================================
 *  CHAT DATA — canned, nothing talks to a server
 * ================================================================== */

export const OPENING_MESSAGES = [
  {
    id: 1,
    from: "bot",
    text: "Hi — I can help you make sense of your spending. Ask me about any category, month, or purchase.",
  },
];

export const SUGGESTIONS = [
  "Where did most of my money go?",
  "Compare June to July",
  "Biggest purchase this month",
];

const CANNED = [
  {
    match: /most|where|top|category/i,
    text: "Food & Dining leads at EGP 289 — that's 23% of your transactions, mostly weekday lunches under EGP 20.",
  },
  {
    match: /compare|june|month|jun|jul/i,
    text: "July is down EGP 296 against June (EGP 1,106 vs EGP 1,402). Shopping dropped the most, from EGP 412 to EGP 178.",
  },
  {
    match: /biggest|largest|highest|expensive/i,
    text: "Your largest purchase in July was EGP 168 at Northgate Home on the 21st, filed under Shopping.",
  },
];

const FALLBACK =
  "I'm a preview — not connected to your transactions yet. Once the API is wired up, I'll answer this for real.";

export const replyTo = (text) =>
  CANNED.find((c) => c.match.test(text))?.text ?? FALLBACK;
