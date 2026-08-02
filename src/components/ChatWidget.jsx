import { useState, useRef, useEffect } from "react";
import { OPENING_MESSAGES, SUGGESTIONS, replyTo } from "../data/chat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(OPENING_MESSAGES);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

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

  const send = (text) => {
    const clean = text.trim();
    if (!clean) return;

    setMessages((m) => [...m, { id: nextId.current++, from: "user", text: clean }]);
    setDraft("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, from: "bot", text: replyTo(clean) },
      ]);
    }, 700);
  };

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
                Preview — no data connected
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
              </div>
            ))}

            {typing && (
              <div className="fc-msg fc-msg--bot fc-msg--typing" aria-label="Assistant is typing">
                <i /><i /><i />
              </div>
            )}

            {messages.length === 1 && !typing && (
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
              placeholder="Ask about your spending"
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
