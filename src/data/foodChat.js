/* ==================================================================
 *  FOOD RECOMMENDER — guided conversation + ranking.
 *  Pure data/logic (no network, no browser APIs). Backed by the
 *  curated list in restaurants.js — swap that for a real API later.
 * ================================================================== */
import { RESTAURANTS, AREAS, CUISINES, mapsUrlFor } from "./restaurants";

// Kicks off the flow when the user asks about eating out.
export const FOOD_TRIGGER =
  /\b(eat|food|restaurant|hungry|lunch|dinner|breakfast|dine|where.*(eat|go)|recommend.*(place|restaurant|food)|somewhere to eat)\b/i;

export const isFoodRequest = (text) => FOOD_TRIGGER.test(text);

// User can bail out mid-flow.
export const CANCEL = /^\s*(cancel|stop|nevermind|never mind|start over|restart)\s*$/i;

// The questions, asked one at a time. Each has quick-reply chips.
export const FOOD_STEPS = [
  {
    key: "area",
    question: "Nice — let's find you somewhere to eat. Which area?",
    chips: AREAS,
  },
  {
    key: "people",
    question: "How many people?",
    chips: ["1", "2", "3–4", "5+"],
  },
  {
    key: "budget",
    question: "Roughly what's your budget per person (EGP)?",
    chips: ["Under 100", "100–250", "250–500", "500+"],
  },
  {
    key: "cuisine",
    question: "Any cuisine in mind?",
    chips: CUISINES,
  },
];

// ---- parsers: turn a chip label or free text into a stored value -----

export const parseArea = (text) => {
  const t = text.trim().toLowerCase();
  return AREAS.find((a) => a.toLowerCase() === t || t.includes(a.toLowerCase())) || null;
};

export const parsePeople = (text) => {
  // "3–4" / "3-4" -> 4 ; "5+" -> 5 ; "2" -> 2
  const nums = text.match(/\d+/g);
  if (!nums) return null;
  const value = Math.max(...nums.map(Number));
  return value >= 1 ? value : null;
};

export const parseBudget = (text) => {
  const t = text.toLowerCase();
  if (/under\s*100|<\s*100/.test(t)) return 100;
  const nums = text.replace(/,/g, "").match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  const values = nums.map(Number).filter((n) => n > 0);
  if (!values.length) return null;
  // For a range like "100–250" use the upper bound as the ceiling.
  const top = Math.max(...values);
  // "500+" means "500 or more" — treat as a generous ceiling so pricier,
  // higher-end spots aren't excluded.
  return /\+/.test(text) ? top * 2 : top;
};

// Broad chips cover several specific cuisines in the data.
const CUISINE_GROUPS = {
  asian: ["asian", "japanese", "thai", "korean", "chinese", "sushi"],
  lebanese: ["lebanese", "levantine", "syrian", "palestinian"],
  cafe: ["cafe", "bakery", "coffee"],
  burgers: ["burgers", "american"],
};

// True if a restaurant's cuisine satisfies the chosen chip (directly or
// as a member of that chip's group).
export const cuisineMatches = (restaurantCuisine, wanted) => {
  const rc = restaurantCuisine.toLowerCase();
  const w = wanted.toLowerCase();
  if (rc === w) return true;
  const group = CUISINE_GROUPS[w];
  return group ? group.includes(rc) : false;
};

export const parseCuisine = (text) => {
  const t = text.trim().toLowerCase();
  if (/any|whatever|no preference|surprise|anything/.test(t)) return "Any";
  // Direct match against a chip label.
  const direct = CUISINES.find(
    (c) => c !== "Any" && (c.toLowerCase() === t || t.includes(c.toLowerCase()))
  );
  if (direct) return direct;
  // Map free-text / specific cuisines onto the closest chip.
  if (/sushi|japanese|thai|korean|chinese|ramen|noodle|asian/.test(t)) return "Asian";
  if (/syrian|shawarma|levant|palestin|mezze/.test(t)) return "Lebanese";
  if (/pizza|pasta/.test(t)) return "Italian";
  if (/coffee|bakery|brunch|breakfast|pastr/.test(t)) return "Cafe";
  if (/burger/.test(t)) return "Burgers";
  if (/fish|seafood|shrimp/.test(t)) return "Seafood";
  if (/sweet|dessert|ice cream|gelato/.test(t)) return "Dessert";
  if (/grill|kebab|kofta/.test(t)) return "Grills";
  return "Any";
};

// ---- ranking ---------------------------------------------------------

/**
 * Score & rank the curated list against the collected answers.
 * @returns {{ list: Array, widenedArea: boolean }}
 */
export function recommendRestaurants({ area, people, budget, cuisine }) {
  const wantCuisine = cuisine && cuisine !== "Any" ? cuisine.toLowerCase() : null;

  const scored = RESTAURANTS.map((r) => {
    let score = r.rating || 0; // rating as a gentle tie-breaker
    let budgetFit = null;

    if (area && r.area.toLowerCase() === area.toLowerCase()) {
      score += 40;
    }
    if (wantCuisine && cuisineMatches(r.cuisine, wantCuisine)) {
      score += 25;
    }
    if (budget) {
      if (r.pricePerPerson <= budget) {
        score += 30;
        budgetFit = "within budget";
      } else if (r.pricePerPerson <= budget * 1.2) {
        score += 8;
        budgetFit = "just over budget";
      } else {
        score -= 25;
        budgetFit = "over budget";
      }
    }
    if (people >= 5 && r.groupFriendly) {
      score += 12;
    }

    return { ...r, score, budgetFit, mapsUrl: mapsUrlFor(r) };
  });

  // Prefer matches in the chosen area; if fewer than 3 there, widen.
  let pool = area
    ? scored.filter((r) => r.area.toLowerCase() === area.toLowerCase())
    : scored;
  let widenedArea = false;
  if (pool.length < 3) {
    widenedArea = Boolean(area);
    pool = scored;
  }

  pool.sort((a, b) => b.score - a.score);
  return { list: pool.slice(0, 3), widenedArea };
}
