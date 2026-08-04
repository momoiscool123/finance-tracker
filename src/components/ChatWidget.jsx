import { useState, useRef, useEffect } from "react";
import { OPENING_MESSAGES, SUGGESTIONS, replyTo } from "../data/chat";
import {
  STEPS,
  CONFIRM_CHIPS,
  RESULTS_ACTION_CHIPS,
  RESET_REGEX,
  CHANGE_REGEX,
  REFINE_REGEX,
  isFoodRequest,
  nextStep,
  summaryText,
} from "../data/foodChat";
import { fetchFoodRecommendations, getBrowserLocation } from "../services/foodApi";
import FoodRecommendationCard from "./FoodRecommendationCard";

const CHANGE_TARGET_MAP = {
  budget: "budget",
  people: "people",
  meal: "meal",
  cuisine: "cuisine",
  location: "location",
  distance: "distance",
  service: "service",
  preference: "preference",
};

const REFINE_TARGET_MAP = {
  cheaper: "cheapest",
  closer: "closest",
  closest: "closest",
  "best rated": "best_rated",
};

const FIELD_BY_STEP = {
  budget: "budget",
  people: "people",
  meal: "meal_type",
  cuisine: "cuisine",
  location: "location",
  distance: "maximum_distance_km",
  service: "service_type",
  openNow: "open_now",
  dietary: "dietary_requirements",
  preference: "preference",
};

function buildPayload(collected) {
  const usingCurrentLocation = collected.latitude != null && collected.longitude != null;
  return {
    budget: Number(collected.budget),
    people: Number(collected.people),
    meal_type: collected.meal_type || "any",
    cuisine: collected.cuisine || "any",
    location: usingCurrentLocation ? null : collected.location || null,
    latitude: usingCurrentLocation ? collected.latitude : null,
    longitude: usingCurrentLocation ? collected.longitude : null,
    maximum_distance_km: collected.maximum_distance_km || 5,
    service_type: collected.service_type || "dine-in",
    open_now: !!collected.open_now,
    dietary_requirements: collected.dietary_requirements || [],
    preference: collected.preference || "best_overall",
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(OPENING_MESSAGES);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const [foodStep, setFoodStep] = useState(null);
  const [collected, setCollected] = useState({});
  const [lastFoodResponse, setLastFoodResponse] = useState(null);
  const [searching, setSearching] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(2);
  const abortRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pushBot = (text) => setMessages((m) => [...m, { id: nextId.current++, from: "bot", text }]);
  const pushUser = (text) => setMessages((m) => [...m, { id: nextId.current++, from: "user", text }]);
  const pushResults = (payload) =>
    setMessages((m) => [...m, { id: nextId.current++, from: "bot", type: "food-results", payload }]);

  const startFoodFlow = () => {
    setCollected({});
    setLastFoodResponse(null);
    setFoodStep("budget");
    pushBot(STEPS.budget.question);
  };

  const resetFoodFlow = (message) => {
    abortRef.current?.abort();
    setFoodStep(null);
    setCollected({});
    setLastFoodResponse(null);
    setSearching(false);
    pushBot(message);
  };

  const runSearch = async (collectedData) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setTyping(true);

    try {
      const response = await fetchFoodRecommendations(buildPayload(collectedData), {
        signal: controller.signal,
      });
      setCollected(collectedData);
      setLastFoodResponse(response);
      setFoodStep("results");
      setTyping(false);

      const notes = [response.price_information_note, response.relaxed_note, ...(response.warnings || [])].filter(
        Boolean
      );

      if (!response.recommendations || response.recommendations.length === 0) {
        pushBot(
          notes.join(" ") ||
            'I couldn\'t find matching places this time. Try a wider distance, a different area, or say "start again".'
        );
      } else {
        pushBot(notes.join(" "));
        pushResults(response);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setTyping(false);
      setFoodStep("confirm");
      pushBot(`${err.message} Say "search now" to try again, or "start again" to restart.`);
    } finally {
      setSearching(false);
    }
  };

  const requestCurrentLocation = async () => {
    if (foodStep !== "location") return;
    pushUser("Use my current location");
    setGeoBusy(true);
    setTyping(true);
    try {
      const { latitude, longitude } = await getBrowserLocation();
      const updated = { ...collected, latitude, longitude, location: null };
      setCollected(updated);
      setTyping(false);
      const next = nextStep("location");
      setFoodStep(next);
      pushBot("Got it — using your current location. Your coordinates are only used for this search.");
      pushBot(STEPS[next].question);
    } catch (err) {
      setTyping(false);
      pushBot(`${err?.message || "Could not get your location."} You can pick an area below instead.`);
    } finally {
      setGeoBusy(false);
    }
  };

  const handleGenericStep = (text) => {
    const stepDef = STEPS[foodStep];
    const parsed = stepDef.parse(text);
    if (parsed === null || parsed === undefined) {
      pushBot(stepDef.invalid || "Sorry, I didn't quite get that — could you try again?");
      return;
    }

    const field = FIELD_BY_STEP[foodStep];
    const updated = { ...collected, [field]: parsed };
    if (foodStep === "location") {
      updated.latitude = null;
      updated.longitude = null;
    }
    setCollected(updated);

    const next = nextStep(foodStep);
    if (next === "confirm") {
      setFoodStep("confirm");
      pushBot(summaryText(updated));
    } else {
      setFoodStep(next);
      pushBot(STEPS[next].question);
    }
  };

  const handleConfirmAnswer = (text) => {
    const cleaned = text.trim().toLowerCase();
    if (/^(search now|yes|confirm|ok|go|search|y)$/.test(cleaned)) {
      runSearch(collected);
      return;
    }
    pushBot('Say "search now" to run the search, or "start again" to restart.');
  };

  const handleChangeCommand = (text) => {
    const match = text.match(CHANGE_REGEX);
    if (!match) return;
    const target = match[1].toLowerCase().replace(/ type$/, "").trim();
    const step = CHANGE_TARGET_MAP[target];
    if (!step) return;
    setFoodStep(step);
    pushBot(STEPS[step].question);
  };

  const handleRefineCommand = (text) => {
    const match = text.match(REFINE_REGEX);
    if (!match || !lastFoodResponse) return;
    const raw = match[1].toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
    const preference = REFINE_TARGET_MAP[raw] || "best_overall";
    const updated = { ...collected, preference };
    runSearch(updated);
  };

  const send = (text) => {
    const clean = text.trim();
    if (!clean || searching) return;

    pushUser(clean);
    setDraft("");

    if (RESET_REGEX.test(clean) && foodStep !== null) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        resetFoodFlow(
          "Okay, I've cancelled the food search. Ask me about your spending, or tell me you're hungry to start again."
        );
      }, 350);
      return;
    }

    if (CHANGE_REGEX.test(clean) && foodStep !== null) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        handleChangeCommand(clean);
      }, 350);
      return;
    }

    if (REFINE_REGEX.test(clean) && lastFoodResponse) {
      handleRefineCommand(clean);
      return;
    }

    if (foodStep !== null && foodStep !== "results") {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        if (foodStep === "confirm") {
          handleConfirmAnswer(clean);
        } else {
          handleGenericStep(clean);
        }
      }, 450);
      return;
    }

    if (foodStep === null && isFoodRequest(clean)) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        startFoodFlow();
      }, 450);
      return;
    }

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      pushBot(replyTo(clean));
    }, 700);
  };

  let currentChips = null;
  if (foodStep === "confirm") currentChips = CONFIRM_CHIPS;
  else if (foodStep === "results") currentChips = RESULTS_ACTION_CHIPS;
  else if (foodStep && STEPS[foodStep]?.chips) currentChips = STEPS[foodStep].chips;

  const showOpeningSuggestions = !currentChips && foodStep === null && messages.length === 1;

  return (
    <div className="fc">
      {open && (
        <section className="fc-panel" role="dialog" aria-label="Assistant">
          <header className="fc-head">
            <span className="fc-head__mark" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </span>
            <span className="fc-head__text">
              <span className="fc-head__name">Assistant</span>
              <span className="fc-head__status">
                <i className="fc-dot" aria-hidden="true" />
                {foodStep ? "Cairo food search" : "Preview — no data connected"}
              </span>
            </span>
            <button
              type="button"
              className="fc-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="fc-log" ref={scrollRef}>
            {messages.map((m) =>
              m.type === "food-results" ? (
                <div key={m.id} className="fc-food-results">
                  {m.payload.recommendations.map((rec) => (
                    <FoodRecommendationCard key={rec.place_id} rec={rec} />
                  ))}
                </div>
              ) : (
                <div key={m.id} className={`fc-msg fc-msg--${m.from}`}>
                  {m.text}
                </div>
              )
            )}

            {typing && (
              <div className="fc-msg fc-msg--bot fc-msg--typing" aria-label="Assistant is typing">
                <i /><i /><i />
              </div>
            )}

            {!typing && foodStep === "location" && (
              <button
                type="button"
                className="fc-geo-btn"
                onClick={requestCurrentLocation}
                disabled={geoBusy}
              >
                {geoBusy ? "Getting your location…" : "📍 Use my current location"}
              </button>
            )}

            {!typing && currentChips && (
              <ul className="fc-chips">
                {currentChips.map((s) => (
                  <li key={s}>
                    <button type="button" className="fc-chip" onClick={() => send(s)} disabled={searching}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showOpeningSuggestions && !typing && (
              <ul className="fc-chips">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" className="fc-chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="fc-compose">
            <input
              ref={inputRef}
              className="fc-input"
              value={draft}
              placeholder={foodStep ? "Type your answer" : "Ask about your spending"}
              aria-label="Message"
              disabled={searching}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
            />
            <button
              type="button"
              className="fc-send"
              onClick={() => send(draft)}
              disabled={!draft.trim() || searching}
              aria-label="Send message"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`fc-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
