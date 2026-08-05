import { useState, useRef, useEffect } from "react";
import { OPENING_MESSAGES, SUGGESTIONS, replyTo } from "../data/chat";
import { useTransactions } from "../context/TransactionContext";
import {
  FOOD_STEPS,
  isFoodRequest,
  CANCEL,
  parseArea,
  parsePeople,
  parseBudget,
  parseCuisine,
  recommendRestaurants,
} from "../data/foodChat";

// Inline styles for the restaurant recommendation cards (keeps this
// feature self-contained — no extra CSS file to wire up).
const REC = {
  wrap: { display: "grid", gap: 8, marginTop: 10 },
  card: {
    display: "block",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid rgba(120,120,120,0.25)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.5)",
  },
  top: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" },
  name: { fontWeight: 700, fontSize: 14 },
  price: { fontSize: 12, opacity: 0.85, whiteSpace: "nowrap" },
  meta: { display: "block", fontSize: 12, opacity: 0.7, marginTop: 2 },
  blurb: { display: "block", fontSize: 12, opacity: 0.9, marginTop: 4 },
};

export default function ChatWidget() {
  const { transactions } = useTransactions();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(OPENING_MESSAGES);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  // Non-null while the "where should I eat?" flow is running.
  const [food, setFood] = useState(null); // { stepIndex, answers }

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(2);

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

  const pushUser = (text) =>
    setMessages((m) => [...m, { id: nextId.current++, from: "user", text }]);

  // Show the typing indicator briefly, then run `fn` (which adds bot messages).
  const botReply = (fn) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      fn();
    }, 600);
  };
  const botSay = (text, extra = {}) =>
    setMessages((m) => [...m, { id: nextId.current++, from: "bot", text, ...extra }]);

  const retryMessage = (key) => {
    if (key === "area") return "I didn't catch that area — tap one below, or type e.g. \"Maadi\".";
    if (key === "people") return "How many people? A number like 2 or 5 works.";
    if (key === "budget") return "What's your budget per person in EGP? Try a number like 150.";
    return "Pick a cuisine below, or say \"Any\".";
  };

  const buildIntro = (a, widenedArea) => {
    const who = `${a.people} ${a.people === 1 ? "person" : "people"}`;
    const cuisine = a.cuisine && a.cuisine !== "Any" ? ` · ${a.cuisine}` : "";
    const widen = widenedArea ? ` Not many in ${a.area}, so I widened the search.` : "";
    return `For ${who} in ${a.area}${cuisine} up to EGP ${a.budget}/person, try:${widen}`;
  };

  const handleFoodStep = (text, flow) => {
    const step = FOOD_STEPS[flow.stepIndex];
    const value =
      step.key === "area"
        ? parseArea(text)
        : step.key === "people"
        ? parsePeople(text)
        : step.key === "budget"
        ? parseBudget(text)
        : parseCuisine(text); // cuisine always resolves (falls back to "Any")

    if (step.key !== "cuisine" && !value) {
      botReply(() => botSay(retryMessage(step.key)));
      return;
    }

    const answers = { ...flow.answers, [step.key]: value };
    const nextIndex = flow.stepIndex + 1;

    if (nextIndex < FOOD_STEPS.length) {
      setFood({ stepIndex: nextIndex, answers });
      botReply(() => botSay(FOOD_STEPS[nextIndex].question));
      return;
    }

    // Final step done — produce recommendations.
    setFood(null);
    const { list, widenedArea } = recommendRestaurants(answers);
    botReply(() => {
      if (!list.length) {
        botSay("I couldn't find a good match. Try a different area or a higher budget.");
        return;
      }
      botSay(buildIntro(answers, widenedArea), { cards: list });
    });
  };

  const send = (text) => {
    const clean = text.trim();
    if (!clean) return;

    pushUser(clean);
    setDraft("");

    // Mid-flow: treat the message as the current question's answer.
    if (food) {
      if (CANCEL.test(clean)) {
        setFood(null);
        botReply(() =>
          botSay('No worries — cancelled. Ask me about your spending, or say "where should I eat".')
        );
        return;
      }
      handleFoodStep(clean, food);
      return;
    }

    // Start the food flow on a food request.
    if (isFoodRequest(clean)) {
      setFood({ stepIndex: 0, answers: {} });
      botReply(() => botSay(FOOD_STEPS[0].question));
      return;
    }

    // Otherwise answer from the user's transaction data.
    botReply(() => botSay(replyTo(clean, transactions)));
  };

  const activeChips = food && !typing ? FOOD_STEPS[food.stepIndex]?.chips : null;

  return (
    <div className="fc">
      {open && (
        <section className="fc-panel" role="dialog" aria-label="Mwafaraty">
          <header className="fc-head">
            <span className="fc-head__mark" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </span>
            <span className="fc-head__text">
              <span className="fc-head__name">Mwafaraty</span>
              <span className="fc-head__status">
                <i className="fc-dot" aria-hidden="true" />
                {transactions.length
                  ? `Using your ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`
                  : "No transactions yet"}
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
            {messages.map((m) => (
              <div key={m.id} className={`fc-msg fc-msg--${m.from}`}>
                {m.text}
                {m.cards && (
                  <div style={REC.wrap}>
                    {m.cards.map((r) => (
                      <a
                        key={r.name}
                        style={REC.card}
                        href={r.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span style={REC.top}>
                          <span style={REC.name}>{r.name}</span>
                          <span style={REC.price}>~EGP {r.pricePerPerson}/person</span>
                        </span>
                        <span style={REC.meta}>
                          {r.area} · {r.cuisine} · ★ {r.rating}
                          {r.budgetFit && (
                            <span
                              style={{
                                color:
                                  r.budgetFit === "within budget"
                                    ? "#2ebd85"
                                    : r.budgetFit === "just over budget"
                                    ? "#e8a33d"
                                    : "#e5484d",
                              }}
                            >
                              {" "}· {r.budgetFit}
                            </span>
                          )}
                        </span>
                        <span style={REC.blurb}>{r.blurb}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="fc-msg fc-msg--bot fc-msg--typing" aria-label="Mwafaraty is typing">
                <i /><i /><i />
              </div>
            )}

            {/* Quick replies: food-flow chips while a flow is running,
                otherwise the opening suggestions on the first message. */}
            {activeChips && (
              <ul className="fc-chips">
                {activeChips.map((c) => (
                  <li key={c}>
                    <button type="button" className="fc-chip" onClick={() => send(c)}>
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!food && messages.length === 1 && !typing && (
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
              placeholder={food ? "Type your answer…" : "Ask about your spending"}
              aria-label="Message"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
            />
            <button
              type="button"
              className="fc-send"
              onClick={() => send(draft)}
              disabled={!draft.trim()}
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
