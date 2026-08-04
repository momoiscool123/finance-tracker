/* ==================================================================
 *  FOOD FLOW — step definitions, quick-reply chips, and text parsers
 *  for the Cairo restaurant recommendation conversation.
 * ================================================================== */

export const FOOD_TRIGGER_REGEX =
  /\b(food|restaurant|eat|hungry|lunch|dinner|breakfast|cuisine|koshary|shawarma|places? to eat|order (food|takeaway)|recommend.*food|craving)\b/i;

export const RESET_REGEX = /^\s*(cancel|stop|restart|start again|start over|never mind|nevermind)\s*$/i;

export const CHANGE_REGEX =
  /^\s*change\s+(budget|people|meal( type)?|cuisine|location|distance|service( type)?|preference)\s*$/i;

export const REFINE_REGEX = /^\s*show\s+(cheaper|closer|closest|best[\s-]?rated)\s*$/i;

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Dessert", "Coffee", "Fast food", "Any meal type"];

export const CUISINES = [
  "Egyptian", "Italian", "Lebanese", "Asian", "Chinese", "Japanese", "Indian",
  "Burgers", "Pizza", "Seafood", "Grills", "Shawarma", "Cafe", "Bakery",
  "Dessert", "Healthy food", "Vegetarian", "Any cuisine",
];

export const CAIRO_AREAS = [
  "New Cairo", "Fifth Settlement", "Nasr City", "Heliopolis", "Maadi",
  "Zamalek", "Downtown Cairo", "Dokki", "Mohandessin", "Sheikh Zayed",
  "6th of October", "Garden City", "Rehab", "Madinaty", "Shorouk",
  "Mokattam", "Giza",
];

export const SERVICE_TYPES = ["Dine-in", "Takeaway", "Delivery"];

export const PREFERENCES = ["Cheapest", "Closest", "Best-rated", "Best overall match"];

export const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Halal", "Gluten-free", "No pork", "None"];

export const CONFIRM_CHIPS = ["Search now", "Start again"];

export const RESULTS_ACTION_CHIPS = [
  "Show cheaper", "Show closer", "Show best rated", "Change cuisine", "Change location", "Start again",
];

export const CATEGORY_LABELS = {
  best_overall: "Best overall",
  cheapest: "Cheapest likely option",
  best_rated: "Best-rated",
  closest: "Closest",
  alternative: "Alternative option",
};

const MEAL_ALIASES = {
  breakfast: "breakfast",
  brunch: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  supper: "dinner",
  dessert: "dessert",
  sweet: "dessert",
  coffee: "coffee",
  cafe: "coffee",
  "fast food": "fast food",
  fastfood: "fast food",
  any: "any",
  "any meal type": "any",
  "any meal": "any",
  anything: "any",
};

const SERVICE_ALIASES = {
  "dine-in": "dine-in",
  "dine in": "dine-in",
  dinein: "dine-in",
  "eat in": "dine-in",
  takeaway: "takeaway",
  "take away": "takeaway",
  pickup: "takeaway",
  "carry out": "takeaway",
  delivery: "delivery",
  deliver: "delivery",
};

const PREFERENCE_ALIASES = {
  cheapest: "cheapest",
  cheap: "cheapest",
  closest: "closest",
  nearest: "closest",
  "best-rated": "best_rated",
  "best rated": "best_rated",
  "top rated": "best_rated",
  "best overall match": "best_overall",
  "best overall": "best_overall",
  overall: "best_overall",
};

export function isFoodRequest(text) {
  return FOOD_TRIGGER_REGEX.test(text);
}

export function parseBudget(text) {
  const cleaned = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!cleaned) return null;
  const value = parseFloat(cleaned[0]);
  return value > 0 ? value : null;
}

export function parsePeople(text) {
  const match = text.match(/\d+/);
  if (!match) return null;
  const value = parseInt(match[0], 10);
  return value >= 1 ? value : null;
}

export function parseMealType(text) {
  const cleaned = text.trim().toLowerCase();
  if (MEAL_ALIASES[cleaned]) return MEAL_ALIASES[cleaned];
  const found = Object.keys(MEAL_ALIASES).find((k) => cleaned.includes(k));
  return found ? MEAL_ALIASES[found] : "any";
}

export function parseCuisine(text) {
  const cleaned = text.trim().toLowerCase().replace(/^any cuisine$/, "any");
  return cleaned || "any";
}

export function parseLocation(text) {
  return text.trim();
}

export function parseDistance(text) {
  const match = text.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  if (Number.isNaN(value) || value <= 0) return null;
  return Math.min(Math.max(value, 0.5), 50);
}

export function parseServiceType(text) {
  const cleaned = text.trim().toLowerCase();
  if (SERVICE_ALIASES[cleaned]) return SERVICE_ALIASES[cleaned];
  const found = Object.keys(SERVICE_ALIASES).find((k) => cleaned.includes(k));
  return found ? SERVICE_ALIASES[found] : null;
}

export function parseYesNo(text) {
  const cleaned = text.trim().toLowerCase();
  if (/^(y|yes|yeah|yep|sure|correct|open|open now)$/.test(cleaned)) return true;
  if (/^(n|no|nope|doesn'?t matter|any|not required|closed ok)$/.test(cleaned)) return false;
  return null;
}

export function parseDietary(text) {
  const cleaned = text.trim().toLowerCase();
  if (/^(none|no|n\/a|na|nothing|skip)$/.test(cleaned)) return [];
  return cleaned
    .split(/,|\band\b|&/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parsePreference(text) {
  const cleaned = text.trim().toLowerCase();
  if (PREFERENCE_ALIASES[cleaned]) return PREFERENCE_ALIASES[cleaned];
  const found = Object.keys(PREFERENCE_ALIASES).find((k) => cleaned.includes(k));
  return found ? PREFERENCE_ALIASES[found] : "best_overall";
}

export const STEP_ORDER = [
  "budget", "people", "meal", "cuisine", "location", "distance",
  "service", "openNow", "dietary", "preference", "confirm",
];

export const STEPS = {
  budget: {
    question: "Let's find you somewhere to eat in Cairo. What's your total budget in EGP?",
    parse: parseBudget,
    invalid: "That doesn't look like a valid budget. Please enter a positive number, e.g. 500.",
  },
  people: {
    question: "How many people will be eating?",
    parse: parsePeople,
    invalid: "Please enter the number of people, e.g. 2.",
  },
  meal: {
    question: "What type of meal would you like?",
    chips: MEAL_TYPES,
    parse: parseMealType,
    invalid: null,
  },
  cuisine: {
    question: "Which cuisine would you prefer? You can type any cuisine, or pick one below.",
    chips: CUISINES,
    parse: parseCuisine,
    invalid: null,
  },
  location: {
    question:
      "Which area in Cairo? Pick one below, type another Cairo-area location, or use your current location.",
    chips: CAIRO_AREAS,
    parse: parseLocation,
    invalid: "Please enter an area, e.g. Maadi.",
    allowCurrentLocation: true,
  },
  distance: {
    question: "How far are you willing to travel (in km)?",
    chips: ["1 km", "3 km", "5 km", "10 km"],
    parse: parseDistance,
    invalid: "Please enter a distance in km, e.g. 5.",
  },
  service: {
    question: "Dine-in, takeaway, or delivery?",
    chips: SERVICE_TYPES,
    parse: parseServiceType,
    invalid: "Please choose dine-in, takeaway, or delivery.",
  },
  openNow: {
    question: "Does it need to be open right now?",
    chips: ["Yes", "No"],
    parse: parseYesNo,
    invalid: "Please answer yes or no.",
  },
  dietary: {
    question: "Any dietary requirements? (e.g. vegetarian, halal, gluten-free) Type \"none\" to skip.",
    chips: DIETARY_OPTIONS,
    parse: parseDietary,
    invalid: null,
  },
  preference: {
    question: "Would you prefer the cheapest, closest, best-rated, or best overall match?",
    chips: PREFERENCES,
    parse: parsePreference,
    invalid: null,
  },
};

export function nextStep(current) {
  const idx = STEP_ORDER.indexOf(current);
  if (idx === -1 || idx === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[idx + 1];
}

export function summaryText(collected) {
  const lines = [
    `Budget: EGP ${collected.budget}`,
    `People: ${collected.people}`,
    `Meal: ${collected.meal_type}`,
    `Cuisine: ${collected.cuisine}`,
    `Location: ${collected.location || "current location"}`,
    `Max distance: ${collected.maximum_distance_km} km`,
    `Service: ${collected.service_type}`,
    `Must be open now: ${collected.open_now ? "yes" : "no"}`,
    `Dietary: ${collected.dietary_requirements?.length ? collected.dietary_requirements.join(", ") : "none"}`,
    `Preference: ${collected.preference.replace("_", " ")}`,
  ];
  return `Here's what I've got:\n${lines.join("\n")}\n\nShall I search now?`;
}
