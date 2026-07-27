import { useState, useMemo, useRef, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ================================================================== */
/*  DASHBOARD DATA — swap these for your API payload                   */
/* ================================================================== */

const CATEGORY_COLORS = {
  "Food & Dining": "#2ebd85",
  Transport: "#7c5cff",
  Shopping: "#e8a33d",
  Entertainment: "#e5484d",
  Health: "#f06a8a",
  Utilities: "#8b95a5",
};

const SUMMARY = {
  totalSpent: 18432.5,
  period: "July 2026",
  transactions: 42,
  avgPurchase: 438.86,
  topCategory: "Food",
  topCategoryTotal: 4890,
};

const CATEGORY_BREAKDOWN = [
  { name: "Food & Dining", value: 27 },
  { name: "Transport", value: 12 },
  { name: "Shopping", value: 18 },
  { name: "Entertainment", value: 10 },
  { name: "Health", value: 14 },
  { name: "Utilities", value: 19 },
];

const TIMELINE = {
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

const RANGE_DATA = [
  { name: "Food", min: 85, max: 920, avg: 372 },
  { name: "Transport", min: 40, max: 640, avg: 245 },
  { name: "Shopping", min: 210, max: 2600, avg: 880 },
  { name: "Entertainment", min: 120, max: 1150, avg: 465 },
  { name: "Health", min: 180, max: 1980, avg: 720 },
  { name: "Utilities", min: 200, max: 1420, avg: 640 },
];

const money = (n) =>
  "EGP " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ================================================================== */
/*  CHAT DATA — canned, nothing talks to a server                      */
/* ================================================================== */

const OPENING_MESSAGES = [
  {
    id: 1,
    from: "bot",
    text: "Hi — I can help you make sense of your spending. Ask me about any category, month, or purchase.",
  },
];

const SUGGESTIONS = [
  "How much did I spend?",
  "Where did most of my money go?",
  "Compare June to July",
  "Tell me about Shopping",
];

/* Compact money format for chat replies (no decimals). */
const moneyShort = (n) =>
  "EGP " + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/* ------------------------------------------------------------------ */
/*  The answer engine.                                                 */
/*  Every reply is CALCULATED from the dashboard data above, so if you  */
/*  change SUMMARY or RANGE_DATA, the answers change with it.           */
/* ------------------------------------------------------------------ */

function answerFor(question) {
  const q = question.toLowerCase();
  const asked = (...words) => words.some((w) => q.includes(w));

  /* Did they name a category? */
  const cat = RANGE_DATA.find((c) => q.includes(c.name.toLowerCase()));

  /* --- a specific category --- */
  if (cat) {
    const share = CATEGORY_BREAKDOWN.find((c) =>
      c.name.toLowerCase().startsWith(cat.name.toLowerCase())
    );
    return (
      `${cat.name} averaged ${moneyShort(cat.avg)} per purchase` +
      (share ? `, making up ${share.value}% of your transactions` : "") +
      `. Purchases ranged from ${moneyShort(cat.min)} to ${moneyShort(cat.max)}.`
    );
  }

  /* --- average --- */
  if (asked("average", "avg", "typical", "per purchase", "per transaction")) {
    return `Your average purchase was ${money(SUMMARY.avgPurchase)}, across ${SUMMARY.transactions} transactions in ${SUMMARY.period}.`;
  }

  /* --- month comparison --- */
  if (asked("compare", "month", "trend", "may", "jun", "jul", "last")) {
    const m = TIMELINE.Monthly;
    const now = m[m.length - 1];
    const prev = m[m.length - 2];
    const diff = now.spend - prev.spend;
    const dir = diff < 0 ? "down" : "up";
    return `${now.label} came to ${moneyShort(now.spend)} — ${dir} ${moneyShort(Math.abs(diff))} from ${prev.label} (${moneyShort(prev.spend)}).`;
  }

  /* --- biggest purchase --- */
  if (asked("biggest", "largest", "expensive", "highest", "max")) {
    const top = RANGE_DATA.reduce((a, b) => (b.max > a.max ? b : a));
    return `Your largest single purchase was ${moneyShort(top.max)}, in ${top.name}.`;
  }

  /* --- smallest purchase --- */
  if (asked("smallest", "cheapest", "lowest", "least", "min")) {
    const low = RANGE_DATA.reduce((a, b) => (b.min < a.min ? b : a));
    return `Your smallest purchase was ${moneyShort(low.min)}, in ${low.name}.`;
  }

  /* --- top category --- */
  if (asked("top", "most", "where", "main", "biggest categ")) {
    const top = [...CATEGORY_BREAKDOWN].sort((a, b) => b.value - a.value)[0];
    return `${top.name} is your biggest category at ${top.value}% of transactions — ${moneyShort(SUMMARY.topCategoryTotal)} in ${SUMMARY.period}.`;
  }

  /* --- transaction count --- */
  if (asked("how many", "number of", "count", "transactions")) {
    return `You made ${SUMMARY.transactions} transactions in ${SUMMARY.period}, totalling ${money(SUMMARY.totalSpent)}.`;
  }

  /* --- full breakdown --- */
  if (asked("categor", "breakdown", "everything", "all of")) {
    const parts = [...CATEGORY_BREAKDOWN]
      .sort((a, b) => b.value - a.value)
      .map((c) => `${c.name} ${c.value}%`)
      .join(", ");
    return `By share of transactions: ${parts}.`;
  }

  /* --- total --- */
  if (asked("total", "spend", "spent", "how much", "altogether")) {
    return `You spent ${money(SUMMARY.totalSpent)} in ${SUMMARY.period}, across ${SUMMARY.transactions} transactions.`;
  }

  /* --- greeting / help --- */
  if (asked("help", "what can you", "hello", "hi", "hey")) {
    return `Ask me about your total, your average purchase, which category you spend most on, how the months compare, or any single category — Food, Transport, Shopping, Entertainment, Health, Utilities.`;
  }

  return `I can answer questions about totals, averages, categories, and month-to-month trends. Try "how much did I spend" or "tell me about Shopping".`;
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

const Icon = ({ path, size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const icons = {
  dollar: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 8h8M8 12h6" />
    </>
  ),
  bars: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  tag: (
    <>
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  list: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  signout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

/* ================================================================== */
/*  Shared pieces                                                      */
/* ================================================================== */

function StatCard({ label, value, meta, icon, accent }) {
  return (
    <article className="ft-stat">
      <header className="ft-stat__head">
        <span className="ft-stat__label">{label}</span>
        <span className="ft-stat__icon" style={{ color: accent }}>
          <Icon path={icon} />
        </span>
      </header>
      <p className="ft-stat__value">{value}</p>
      <p className="ft-stat__meta">{meta}</p>
    </article>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`ft-panel ${className}`}>
      <header className="ft-panel__head">
        <div>
          <h2 className="ft-panel__title">{title}</h2>
          <p className="ft-panel__subtitle">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ft-tooltip">
      <p className="ft-tooltip__label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="ft-tooltip__row">
          <span
            className="ft-tooltip__swatch"
            style={{ background: entry.color ?? entry.payload?.fill }}
          />
          <span className="ft-tooltip__name">{entry.name}</span>
          <span className="ft-tooltip__value">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Category range candles                                             */
/* ================================================================== */

const BODY_SHARE = 0.76; // body covers the centre 76% of the min–max range

function RangeCandle(props) {
  const { x, y, width, height, payload, fill } = props;
  const { min, max, avg } = payload;
  const span = max - min || 1;

  const yFor = (v) => y + (height * (max - v)) / span;

  const pad = ((1 - BODY_SHARE) / 2) * span;
  const bodyTop = yFor(max - pad);
  const bodyBottom = yFor(min + pad);
  const cx = x + width / 2;

  return (
    <g>
      <line
        x1={cx}
        y1={y}
        x2={cx}
        y2={y + height}
        stroke={fill}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        opacity="0.55"
      />
      <line x1={cx - 7} y1={y} x2={cx + 7} y2={y} stroke={fill} strokeWidth="2" />
      <line
        x1={cx - 7}
        y1={y + height}
        x2={cx + 7}
        y2={y + height}
        stroke={fill}
        strokeWidth="2"
      />
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={Math.max(bodyBottom - bodyTop, 2)}
        rx="3"
        fill={fill}
        fillOpacity="0.85"
      />
      <line
        x1={x - 10}
        y1={yFor(avg)}
        x2={x + width + 10}
        y2={yFor(avg)}
        stroke="#e8a33d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={yFor(avg) - 6}
        textAnchor="middle"
        className="ft-candle__label"
      >
        {avg} EGP
      </text>
    </g>
  );
}

/* ================================================================== */
/*  Chat widget                                                        */
/* ================================================================== */

function ChatWidget() {
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

    /* Short pause so the typing dots register as a reply arriving. */
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, from: "bot", text: answerFor(clean) },
      ]);
    }, 450);
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
                Connected to your spending data
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

/* ================================================================== */
/*  Bank sharing — loan readiness analysis                             */
/* ================================================================== */

/* Commitments the user can't easily cut vs. flexible spending. */
const ESSENTIAL = ["Food", "Transport", "Health", "Utilities"];

/*
 * Everything here is CALCULATED from the dashboard data.
 * Note: CATEGORY_BREAKDOWN is share of *transactions*, not spend, so we
 * estimate spend share as (average purchase x how often) — closer to what
 * a lender would actually care about.
 */
function analyseFinances() {
  const months = TIMELINE.Monthly;

  const avgMonth =
    months.reduce((sum, m) => sum + m.spend, 0) / months.length;

  /* Stability: average distance from the mean, as a % of the mean. */
  const spread =
    months.reduce((sum, m) => sum + Math.abs(m.spend - avgMonth), 0) /
    months.length;
  const variance = (spread / avgMonth) * 100;

  /* Estimated share of total spend per category. */
  const weighted = RANGE_DATA.map((c) => {
    const freq = CATEGORY_BREAKDOWN.find((b) => b.name.startsWith(c.name));
    return { name: c.name, weight: c.avg * (freq ? freq.value : 0) };
  });
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const spendShare = weighted.map((w) => ({
    name: w.name,
    pct: (w.weight / totalWeight) * 100,
  }));

  const discretionary = spendShare
    .filter((c) => !ESSENTIAL.includes(c.name))
    .reduce((sum, c) => sum + c.pct, 0);

  /* Direction of travel, latest month vs the one before. */
  const now = months[months.length - 1];
  const prev = months[months.length - 2];
  const trendPct = ((now.spend - prev.spend) / prev.spend) * 100;

  const topCommitment = spendShare
    .filter((c) => ESSENTIAL.includes(c.name))
    .sort((a, b) => b.pct - a.pct)[0];

  return {
    avgMonth,
    variance,
    discretionary,
    trendPct,
    topCommitment,
    months,
    spendShare,
  };
}

/*
 * Banks the user can apply to.
 *
 * IMPORTANT: the `rate` values below are PLACEHOLDERS for the demo — they are
 * not real quoted rates from these banks. Before presenting this, either
 * replace them with each bank's published personal-loan rate, or state clearly
 * that the figures are illustrative. Don't present invented rates as real.
 */
const BANKS = [
  { id: "nbe", name: "National Bank of Egypt", short: "NBE", rate: 0.215 },
  { id: "cib", name: "CIB", short: "CIB", rate: 0.199 },
  { id: "qnb", name: "QNB Alahli", short: "QNB", rate: 0.205 },
];

/* Standard amortising repayment: what you'd pay each month. */
function monthlyRepayment(principal, months, annualRate) {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function BankPanel() {
  const [stage, setStage] = useState("idle"); // idle | reviewing | shared
  const [amount, setAmount] = useState(50000);
  const [term, setTerm] = useState(24);
  const [bankId, setBankId] = useState("nbe");
  const a = useMemo(() => analyseFinances(), []);

  const bank = BANKS.find((b) => b.id === bankId);

  /* How much flexible money exists each month to cover a repayment. */
  const headroom = a.avgMonth * (a.discretionary / 100);
  const repayment = amount > 0 ? monthlyRepayment(amount, term, bank.rate) : 0;
  const usedPct = headroom > 0 ? (repayment / headroom) * 100 : 0;

  const affordability =
    usedPct <= 40 ? "comfortable" : usedPct <= 75 ? "tight" : "over budget";
  const affordRating =
    usedPct <= 40 ? "strong" : usedPct <= 75 ? "fair" : "weak";

  /* Each indicator carries its own rating and a plain-language reason. */
  const indicators = [
    {
      label: "Income stability",
      value: `±${a.variance.toFixed(1)}%`,
      rating: a.variance <= 10 ? "strong" : a.variance <= 20 ? "fair" : "weak",
      note:
        a.variance <= 10
          ? "Monthly spending is consistent, which suggests predictable income."
          : "Monthly spending swings noticeably month to month.",
    },
    {
      label: "Flexible spending",
      value: `${a.discretionary.toFixed(0)}%`,
      rating:
        a.discretionary >= 30 ? "strong" : a.discretionary >= 20 ? "fair" : "weak",
      note: `${a.discretionary.toFixed(0)}% goes to non-essentials — spending that could be reduced to cover a repayment.`,
    },
    {
      label: "Recent trend",
      value: `${a.trendPct >= 0 ? "+" : ""}${a.trendPct.toFixed(1)}%`,
      rating: a.trendPct <= 0 ? "strong" : a.trendPct <= 10 ? "fair" : "weak",
      note:
        a.trendPct <= 0
          ? "Spending is falling, not accelerating."
          : "Spending is rising against the previous month.",
    },
    {
      label: "Largest commitment",
      value: `${a.topCommitment.pct.toFixed(0)}%`,
      rating: a.topCommitment.pct <= 30 ? "strong" : "fair",
      note: `${a.topCommitment.name} is the biggest fixed cost, at ${a.topCommitment.pct.toFixed(0)}% of spend.`,
    },
  ];

  const strong = indicators.filter((i) => i.rating === "strong").length;
  const history =
    strong >= 3
      ? "Spending patterns look steady"
      : strong >= 2
        ? "Spending patterns are mixed"
        : "Spending is uneven";

  const verdict =
    `${history}, and a repayment of ${moneyShort(repayment)} per month is ` +
    `${affordability} against roughly ${moneyShort(headroom)} of flexible ` +
    `spending each month.`;

  return (
    <Panel
      title="Bank sharing"
      subtitle="Spending signals a lender would look at · calculated from your history"
    >
      <ul className="bk-grid">
        {indicators.map((i) => (
          <li key={i.label} className="bk-item">
            <div className="bk-item__top">
              <span className="bk-item__label">{i.label}</span>
              <span className={`bk-chip bk-chip--${i.rating}`}>{i.rating}</span>
            </div>
            <p className="bk-item__value">{i.value}</p>
            <p className="bk-item__note">{i.note}</p>
          </li>
        ))}
      </ul>

      <div className="bk-request">
        <p className="bk-request__title">What are you applying for?</p>

        <div className="bk-banks" role="radiogroup" aria-label="Choose a bank">
          {BANKS.map((b) => {
            const bRepay = amount > 0 ? monthlyRepayment(amount, term, b.rate) : 0;
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={bankId === b.id}
                className={`bk-bank ${bankId === b.id ? "is-active" : ""}`}
                onClick={() => setBankId(b.id)}
              >
                <span className="bk-bank__mark">{b.short}</span>
                <span className="bk-bank__body">
                  <span className="bk-bank__name">{b.name}</span>
                  <span className="bk-bank__rate">
                    {(b.rate * 100).toFixed(1)}% · {moneyShort(bRepay)}/mo
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="bk-fields">
          <label className="bk-field">
            <span className="bk-field__label">Amount (EGP)</span>
            <input
              type="number"
              className="bk-input"
              value={amount}
              min="1000"
              step="1000"
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </label>

          <label className="bk-field">
            <span className="bk-field__label">Over</span>
            <select
              className="bk-input"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
            >
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
              <option value={36}>36 months</option>
              <option value={48}>48 months</option>
            </select>
          </label>

          <div className="bk-field">
            <span className="bk-field__label">Monthly repayment</span>
            <p className="bk-repay">
              {moneyShort(repayment)}
              <span className={`bk-chip bk-chip--${affordRating}`}>
                {affordability}
              </span>
            </p>
          </div>
        </div>

        <div className="bk-meter" role="img"
          aria-label={`Repayment uses ${usedPct.toFixed(0)} percent of flexible spending`}>
          <div
            className={`bk-meter__fill bk-meter__fill--${affordRating}`}
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
        <p className="bk-meter__note">
          Uses {usedPct.toFixed(0)}% of your flexible spending ·
          {" "}{bank.short} at {(bank.rate * 100).toFixed(1)}% (illustrative)
        </p>
      </div>

      <div className="bk-verdict">
        <p className="bk-verdict__text">{verdict}</p>
        <p className="bk-verdict__caveat">
          Illustrative only — not a lending decision. A bank would combine this
          with income verification and its own checks.
        </p>
      </div>

      {/* ---- consent flow ---- */}
      {stage === "idle" && (
        <button
          type="button"
          className="bk-btn"
          onClick={() => setStage("reviewing")}
        >
          Share with my bank
        </button>
      )}

      {stage === "reviewing" && (
        <div className="bk-review">
          <p className="bk-review__title">
            You would share with {bank.name}:
          </p>
          <ul className="bk-review__list">
            <li>
              Your request: {moneyShort(amount)} over {term} months
            </li>
            <li>Monthly totals for {a.months.length} months</li>
            <li>Category breakdown by percentage</li>
            <li>The four indicators above</li>
          </ul>
          <p className="bk-review__title bk-review__title--no">
            You would <em>not</em> share:
          </p>
          <ul className="bk-review__list bk-review__list--no">
            <li>Individual transactions or merchant names</li>
            <li>Account numbers or card details</li>
            <li>Anything outside the {a.months.length} months shown</li>
          </ul>
          <div className="bk-actions">
            <button
              type="button"
              className="bk-btn bk-btn--ghost"
              onClick={() => setStage("idle")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bk-btn"
              onClick={() => setStage("shared")}
            >
              Confirm and share
            </button>
          </div>
        </div>
      )}

      {stage === "shared" && (
        <div className="bk-shared">
          <p className="bk-shared__text">
            <span className="bk-shared__dot" aria-hidden="true" />
            Sent to {bank.short} · reference FT-2026-07-0042
          </p>
          <button
            type="button"
            className="bk-btn bk-btn--ghost"
            onClick={() => setStage("idle")}
          >
            Revoke access
          </button>
        </div>
      )}
    </Panel>
  );
}

/* ================================================================== */
/*  Dashboard — the default export                                     */
/* ================================================================== */

export default function Dashboard() {
  const [grain, setGrain] = useState("Monthly");
  const [activeSlice, setActiveSlice] = useState(null);

  const timeline = TIMELINE[grain];
  const rangeSeries = useMemo(
    () => RANGE_DATA.map((d) => ({ ...d, range: [d.min, d.max] })),
    []
  );

  return (
    <div className="ft">
      <style>{css}</style>

      {/* ---------------- sidebar ---------------- */}
      <aside className="ft-sidebar">
        <div className="ft-brand">
          <span className="ft-brand__mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </span>
          <span className="ft-brand__name">Fintrack</span>
        </div>

        <nav className="ft-nav" aria-label="Main">
          <a className="ft-nav__item is-active" href="#dashboard">
            <Icon path={icons.grid} size={15} />
            Dashboard
          </a>
          <a className="ft-nav__item" href="#transactions">
            <Icon path={icons.list} size={15} />
            Transactions
          </a>
        </nav>

        <div className="ft-user">
          <div className="ft-user__row">
            <span className="ft-user__avatar">t</span>
            <span className="ft-user__text">
              <span className="ft-user__name">testing</span>
              <span className="ft-user__mail">testing@gmail.com</span>
            </span>
          </div>
          <button className="ft-signout" type="button">
            <Icon path={icons.signout} size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <main className="ft-main">
        <div className="ft-shell">
          <header className="ft-header">
            <h1 className="ft-header__title">Dashboard</h1>
            <p className="ft-header__sub">
              Transaction analytics · {SUMMARY.period}
            </p>
          </header>

          <div className="ft-stats">
            <StatCard
              label="Total spent"
              value={money(SUMMARY.totalSpent)}
              meta={SUMMARY.period}
              icon={icons.dollar}
              accent="#2ebd85"
            />
            <StatCard
              label="Transactions"
              value={SUMMARY.transactions}
              meta="This month"
              icon={icons.receipt}
              accent="#7c5cff"
            />
            <StatCard
              label="Avg purchase"
              value={money(SUMMARY.avgPurchase)}
              meta="Per transaction"
              icon={icons.bars}
              accent="#e8a33d"
            />
            <StatCard
              label="Top category"
              value={SUMMARY.topCategory}
              meta={`${money(SUMMARY.topCategoryTotal)} total`}
              icon={icons.tag}
              accent="#f06a8a"
            />
          </div>

          <div className="ft-row">
            <Panel
              title="Category breakdown"
              subtitle="Transaction frequency · all time"
              className="ft-panel--donut"
            >
              <div className="ft-donut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={CATEGORY_BREAKDOWN}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={74}
                      paddingAngle={2}
                      stroke="none"
                      labelLine={false}
                      onMouseEnter={(_, i) => setActiveSlice(i)}
                      onMouseLeave={() => setActiveSlice(null)}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                        const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                        const rad = (-midAngle * Math.PI) / 180;
                        return (
                          <text
                            x={cx + r * Math.cos(rad)}
                            y={cy + r * Math.sin(rad)}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="ft-donut__pct"
                          >
                            {value}%
                          </text>
                        );
                      }}
                    >
                      {CATEGORY_BREAKDOWN.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CATEGORY_COLORS[entry.name]}
                          opacity={
                            activeSlice === null || activeSlice === i ? 1 : 0.35
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v}%`} />}
                      cursor={false}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <ul className="ft-legend">
                  {CATEGORY_BREAKDOWN.map((c) => (
                    <li key={c.name} className="ft-legend__item">
                      <span
                        className="ft-legend__dot"
                        style={{ background: CATEGORY_COLORS[c.name] }}
                      />
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel
              title="Purchase timeline"
              subtitle="Spend (bar) with rolling average overlay (line)"
              className="ft-panel--timeline"
              action={
                <div className="ft-segment" role="tablist" aria-label="Time grain">
                  {["Daily", "Weekly", "Monthly"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="tab"
                      aria-selected={grain === g}
                      className={`ft-segment__btn ${grain === g ? "is-active" : ""}`}
                      onClick={() => setGrain(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart
                  data={timeline}
                  margin={{ top: 8, right: 4, bottom: 0, left: -12 }}
                >
                  <CartesianGrid
                    stroke="#1e252e"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7d8590", fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7d8590", fontSize: 10 }}
                    tickFormatter={(v) => `EGP ${v}`}
                    width={64}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={(v) => money(v)} />}
                    cursor={{ fill: "#ffffff08" }}
                  />
                  <Bar
                    dataKey="spend"
                    name="Spend"
                    fill="#2ebd85"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={62}
                  />
                  <Line
                    dataKey="avg"
                    name="Rolling average"
                    type="monotone"
                    stroke="#e8a33d"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel
            title="Category range analysis"
            subtitle={`${SUMMARY.period} · Candlestick per category showing min · max · average purchase amount`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={rangeSeries}
                margin={{ top: 18, right: 24, bottom: 0, left: -8 }}
              >
                <CartesianGrid stroke="#1e252e" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9ba4b0", fontSize: 11 }}
                  tickMargin={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7d8590", fontSize: 10 }}
                  tickFormatter={(v) => `EGP ${v}`}
                  domain={[0, 2800]}
                  ticks={[0, 700, 1400, 2100, 2800]}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff06" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="ft-tooltip">
                        <p className="ft-tooltip__label">{label}</p>
                        <p className="ft-tooltip__row">
                          <span className="ft-tooltip__name">Min</span>
                          <span className="ft-tooltip__value">EGP {d.min}</span>
                        </p>
                        <p className="ft-tooltip__row">
                          <span className="ft-tooltip__name">Average</span>
                          <span className="ft-tooltip__value">EGP {d.avg}</span>
                        </p>
                        <p className="ft-tooltip__row">
                          <span className="ft-tooltip__name">Max</span>
                          <span className="ft-tooltip__value">EGP {d.max}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="range" shape={<RangeCandle />} maxBarSize={30}>
                  {rangeSeries.map((d) => (
                    <Cell
                      key={d.name}
                      fill={
                        Object.values(CATEGORY_COLORS)[
                        RANGE_DATA.findIndex((r) => r.name === d.name)
                        ]
                      }
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>

            <ul className="ft-keys">
              <li>
                <span className="ft-key__body" />
                Body (centre 76% of range)
              </li>
              <li>
                <span className="ft-key__avg" />
                Average
              </li>
              <li>
                <span className="ft-key__wick" />
                Min – max range
              </li>
            </ul>
          </Panel>

          <BankPanel />
        </div>
      </main>

      {/* ---------------- chat ---------------- */}
      <ChatWidget />
    </div>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const css = `
.ft {
  --bg: #0b0f14;
  --sidebar: #090c11;
  --panel: #12171e;
  --panel-2: #151b23;
  --line: #1e252e;
  --line-soft: #171d25;
  --text: #e6edf3;
  --text-dim: #9ba4b0;
  --text-mute: #6e7681;
  --accent: #2ebd85;
  --accent-soft: #2ebd8520;

  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.ft *, .ft *::before, .ft *::after { box-sizing: border-box; }
.ft h1, .ft h2, .ft p, .ft ul { margin: 0; }
.ft ul { list-style: none; padding: 0; }
.ft :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

/* ---- sidebar ---- */
.ft-sidebar {
  width: 200px;
  flex: 0 0 200px;
  background: var(--sidebar);
  border-right: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.ft-brand { display: flex; align-items: center; gap: 9px; padding: 4px 6px 22px; }
.ft-brand__mark {
  width: 24px; height: 24px; border-radius: 7px;
  background: var(--accent); color: #06120c;
  display: grid; place-items: center;
}
.ft-brand__name { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }

.ft-nav { display: flex; flex-direction: column; gap: 2px; }
.ft-nav__item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 7px;
  font-size: 12.5px; color: var(--text-dim);
  text-decoration: none;
  transition: background .15s ease, color .15s ease;
}
.ft-nav__item:hover { background: #ffffff08; color: var(--text); }
.ft-nav__item.is-active { background: var(--accent-soft); color: var(--accent); }

.ft-user { margin-top: auto; border-top: 1px solid var(--line-soft); padding-top: 12px; }
.ft-user__row { display: flex; align-items: center; gap: 9px; padding: 0 6px; }
.ft-user__avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  display: grid; place-items: center;
  font-size: 11px; font-weight: 600; flex: 0 0 24px;
}
.ft-user__text { display: flex; flex-direction: column; min-width: 0; }
.ft-user__name { font-size: 11.5px; font-weight: 500; }
.ft-user__mail {
  font-size: 10px; color: var(--text-mute);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ft-signout {
  display: flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 7px 10px; width: 100%;
  background: none; border: 0; border-radius: 7px;
  color: var(--text-mute); font-size: 11.5px; font-family: inherit;
  cursor: pointer; transition: background .15s ease, color .15s ease;
}
.ft-signout:hover { background: #ffffff08; color: var(--text); }

/* ---- main ---- */
.ft-main { flex: 1; min-width: 0; padding: 28px 24px 56px; }
.ft-shell { max-width: 1180px; margin: 0 auto; }

.ft-header { margin-bottom: 20px; }
.ft-header__title { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; }
.ft-header__sub { font-size: 11.5px; color: var(--text-mute); margin-top: 3px; }

/* ---- stat cards ---- */
.ft-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.ft-stat {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 15px 15px;
}
.ft-stat__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ft-stat__label {
  font-size: 9px; letter-spacing: .09em; text-transform: uppercase;
  color: var(--text-mute); font-weight: 600;
}
.ft-stat__icon {
  width: 22px; height: 22px; border-radius: 6px;
  background: #ffffff09; display: grid; place-items: center;
}
.ft-stat__value {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 20px; font-weight: 600; letter-spacing: -0.02em;
  margin-top: 12px;
}
.ft-stat__meta { font-size: 10px; color: var(--text-mute); margin-top: 4px; }

/* ---- panels ---- */
.ft-row {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 14px;
  margin-bottom: 14px;
}
.ft-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 15px 16px;
}
.ft-panel__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; margin-bottom: 10px;
}
.ft-panel__title { font-size: 12.5px; font-weight: 600; letter-spacing: -0.01em; }
.ft-panel__subtitle { font-size: 10px; color: var(--text-mute); margin-top: 3px; }

/* ---- segmented control ---- */
.ft-segment {
  display: flex; gap: 2px; padding: 2px;
  background: #ffffff07; border-radius: 7px; flex: none;
}
.ft-segment__btn {
  border: 0; background: none; border-radius: 5px;
  padding: 4px 9px; font-size: 10px; font-family: inherit;
  color: var(--text-mute); cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.ft-segment__btn:hover { color: var(--text); }
.ft-segment__btn.is-active { background: var(--accent); color: #06120c; font-weight: 600; }

/* ---- donut ---- */
.ft-donut { display: flex; flex-direction: column; gap: 8px; }
.ft-donut__pct { fill: #04140d; font-size: 9px; font-weight: 700; }
.ft-legend {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 4px 12px; font-size: 9px; color: var(--text-dim);
}
.ft-legend__item { display: flex; align-items: center; gap: 5px; }
.ft-legend__dot { width: 6px; height: 6px; border-radius: 50%; }

/* ---- candles ---- */
.ft-candle__label {
  fill: var(--text); font-size: 9px; font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ft-keys {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 6px 20px; margin-top: 10px;
  font-size: 9.5px; color: var(--text-dim);
}
.ft-keys li { display: flex; align-items: center; gap: 7px; }
.ft-key__body { width: 9px; height: 9px; border-radius: 2px; background: #8b95a5; opacity: .85; }
.ft-key__avg { width: 16px; height: 2.5px; border-radius: 2px; background: #e8a33d; }
.ft-key__wick {
  width: 16px; height: 0;
  border-top: 1.5px dashed var(--text-mute);
}

/* ---- tooltip ---- */
.ft-tooltip {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: 0 8px 24px #00000060;
  font-size: 10.5px;
}
.ft-tooltip__label { font-weight: 600; margin-bottom: 5px; color: var(--text); }
.ft-tooltip__row { display: flex; align-items: center; gap: 8px; color: var(--text-dim); }
.ft-tooltip__row + .ft-tooltip__row { margin-top: 2px; }
.ft-tooltip__swatch { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.ft-tooltip__name { margin-right: auto; }
.ft-tooltip__value {
  color: var(--text); font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* ================== chat widget ================== */
.fc { font-family: inherit; }
.fc *, .fc *::before, .fc *::after { box-sizing: border-box; }
.fc ul { list-style: none; margin: 0; padding: 0; }

.fc-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 50px;
  height: 50px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
  color: #06120c;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 6px 24px #2ebd8545, 0 2px 8px #00000060;
  transition: transform .18s ease, box-shadow .18s ease;
  z-index: 60;
}
.fc-fab:hover { transform: translateY(-2px); box-shadow: 0 10px 30px #2ebd8555, 0 2px 8px #00000060; }
.fc-fab.is-open { background: var(--panel-2); color: var(--text-dim); box-shadow: 0 2px 8px #00000060; }

.fc-panel {
  position: fixed;
  right: 24px;
  bottom: 86px;
  width: 340px;
  height: min(470px, calc(100vh - 130px));
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 24px 60px #00000075;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 60;
  animation: fc-rise .18s ease-out;
}
@keyframes fc-rise {
  from { opacity: 0; transform: translateY(10px) scale(.98); }
  to   { opacity: 1; transform: none; }
}

.fc-head {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 12px;
  border-bottom: 1px solid var(--line);
  flex: none;
}
.fc-head__mark {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--accent); color: #06120c;
  display: grid; place-items: center; flex: none;
}
.fc-head__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fc-head__name { font-size: 12.5px; font-weight: 600; color: var(--text); }
.fc-head__status {
  display: flex; align-items: center; gap: 5px;
  font-size: 9.5px; color: var(--text-mute); font-style: normal;
}
.fc-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent); flex: none;
}
.fc-close {
  margin-left: auto; flex: none;
  width: 26px; height: 26px;
  border: 0; border-radius: 7px;
  background: none; color: var(--text-mute);
  display: grid; place-items: center; cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.fc-close:hover { background: #ffffff0a; color: var(--text); }

.fc-log {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
  scrollbar-color: #2a323d transparent;
}
.fc-log::-webkit-scrollbar { width: 6px; }
.fc-log::-webkit-scrollbar-thumb { background: #2a323d; border-radius: 3px; }

.fc-msg {
  max-width: 82%;
  padding: 8px 11px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  animation: fc-pop .16s ease-out;
}
@keyframes fc-pop {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.fc-msg--bot {
  align-self: flex-start;
  background: var(--panel-2);
  color: var(--text-dim);
  border-bottom-left-radius: 4px;
}
.fc-msg--user {
  align-self: flex-end;
  background: var(--accent);
  color: #06120c;
  font-weight: 500;
  border-bottom-right-radius: 4px;
}

.fc-msg--typing { display: flex; gap: 4px; padding: 11px; }
.fc-msg--typing i {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--text-mute);
  animation: fc-blink 1.2s infinite;
}
.fc-msg--typing i:nth-child(2) { animation-delay: .2s; }
.fc-msg--typing i:nth-child(3) { animation-delay: .4s; }
@keyframes fc-blink {
  0%, 60%, 100% { opacity: .25; }
  30% { opacity: 1; }
}

.fc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.fc-chip {
  border: 1px solid var(--line);
  background: none;
  color: var(--text-dim);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 10.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color .15s ease, color .15s ease, background .15s ease;
}
.fc-chip:hover { border-color: var(--accent); color: var(--accent); background: #2ebd8510; }

.fc-compose {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
  flex: none;
}
.fc-input {
  flex: 1;
  min-width: 0;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 8px 11px;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  transition: border-color .15s ease;
}
.fc-input::placeholder { color: var(--text-mute); }
.fc-input:focus { outline: none; border-color: var(--accent); }
.fc-send {
  flex: none;
  width: 32px; height: 32px;
  border: 0; border-radius: 9px;
  background: var(--accent);
  color: #06120c;
  display: grid; place-items: center;
  cursor: pointer;
  transition: opacity .15s ease;
}
.fc-send:disabled { opacity: .35; cursor: default; }

/* ================== bank sharing ================== */
.bk-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 4px;
}
.bk-item {
  background: #ffffff05;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 11px 12px 12px;
}
.bk-item__top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 8px;
}
.bk-item__label {
  font-size: 9px; letter-spacing: .07em; text-transform: uppercase;
  color: var(--text-mute); font-weight: 600;
}
.bk-chip {
  font-size: 8.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; padding: 2px 6px; border-radius: 999px; flex: none;
}
.bk-chip--strong { background: #2ebd8522; color: #2ebd85; }
.bk-chip--fair   { background: #e8a33d22; color: #e8a33d; }
.bk-chip--weak   { background: #e5484d22; color: #e5484d; }
.bk-item__value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
}
.bk-item__note {
  font-size: 9.5px; line-height: 1.5;
  color: var(--text-mute); margin-top: 5px;
}

.bk-banks {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; margin-bottom: 12px;
}
.bk-bank {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; min-width: 0;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-family: inherit; text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.bk-bank:hover { border-color: #ffffff22; }
.bk-bank.is-active {
  border-color: var(--accent);
  background: #2ebd850f;
}
.bk-bank__mark {
  width: 30px; height: 30px; border-radius: 7px; flex: none;
  display: grid; place-items: center;
  background: #ffffff0d; color: var(--text-dim);
  font-size: 9px; font-weight: 700; letter-spacing: .02em;
}
.bk-bank.is-active .bk-bank__mark {
  background: var(--accent); color: #06120c;
}
.bk-bank__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bk-bank__name {
  font-size: 10.5px; font-weight: 600; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bk-bank__rate {
  font-size: 9.5px; color: var(--text-mute);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bk-bank.is-active .bk-bank__rate { color: var(--accent); }

.bk-request {
  margin-top: 12px; padding: 12px 14px;
  background: #ffffff05; border: 1px solid var(--line); border-radius: 9px;
}
.bk-request__title {
  font-size: 10.5px; font-weight: 600; color: var(--text);
  margin-bottom: 10px;
}
.bk-fields {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; align-items: end;
}
.bk-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.bk-field__label {
  font-size: 9px; letter-spacing: .07em; text-transform: uppercase;
  color: var(--text-mute); font-weight: 600;
}
.bk-input {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 7px 9px;
  color: var(--text);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  width: 100%;
  transition: border-color .15s ease;
}
.bk-input:focus { outline: none; border-color: var(--accent); }
select.bk-input { font-family: inherit; cursor: pointer; }
.bk-repay {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px; font-weight: 600; color: var(--text);
  padding: 6px 0;
}

.bk-meter {
  margin-top: 12px; height: 5px; border-radius: 3px;
  background: #ffffff0d; overflow: hidden;
}
.bk-meter__fill {
  height: 100%; border-radius: 3px;
  transition: width .25s ease, background .25s ease;
}
.bk-meter__fill--strong { background: #2ebd85; }
.bk-meter__fill--fair   { background: #e8a33d; }
.bk-meter__fill--weak   { background: #e5484d; }
.bk-meter__note {
  font-size: 9.5px; color: var(--text-mute); margin-top: 6px;
}

.bk-verdict {
  margin-top: 12px; padding: 11px 13px;
  background: #ffffff05; border-left: 2px solid var(--accent);
  border-radius: 0 8px 8px 0;
}
.bk-verdict__text { font-size: 11.5px; color: var(--text); line-height: 1.5; }
.bk-verdict__caveat {
  font-size: 9.5px; color: var(--text-mute);
  margin-top: 5px; line-height: 1.5;
}

.bk-btn {
  margin-top: 12px;
  border: 0; border-radius: 8px;
  background: var(--accent); color: #06120c;
  padding: 8px 14px;
  font-size: 11px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: opacity .15s ease;
}
.bk-btn:hover { opacity: .88; }
.bk-btn--ghost {
  background: none; color: var(--text-dim);
  border: 1px solid var(--line);
}
.bk-btn--ghost:hover { background: #ffffff08; color: var(--text); }

.bk-review {
  margin-top: 12px; padding: 12px 14px;
  background: #ffffff05; border: 1px solid var(--line); border-radius: 9px;
}
.bk-review__title {
  font-size: 10.5px; font-weight: 600; color: var(--accent);
  margin-bottom: 5px;
}
.bk-review__title--no { color: var(--text-mute); margin-top: 11px; }
.bk-review__list {
  font-size: 10px; color: var(--text-dim); line-height: 1.8;
  padding-left: 14px !important; list-style: disc !important;
}
.bk-review__list--no { color: var(--text-mute); }
.bk-actions { display: flex; gap: 8px; }

.bk-shared {
  margin-top: 12px; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 10px 13px;
  background: #2ebd850d; border: 1px solid #2ebd8533; border-radius: 9px;
}
.bk-shared__text {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.bk-shared__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); flex: none;
}
.bk-shared .bk-btn { margin-top: 0; }

/* ---- responsive ---- */
@media (max-width: 1000px) {
  .ft-row { grid-template-columns: minmax(0, 1fr); }
  .ft-stats { grid-template-columns: repeat(2, 1fr); }
  .bk-grid { grid-template-columns: repeat(2, 1fr); }
  .bk-fields { grid-template-columns: minmax(0, 1fr); }
  .bk-banks { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 720px) {
  .ft { flex-direction: column; }
  .ft-sidebar {
    width: 100%; flex: none; height: auto; position: static;
    flex-direction: row; align-items: center; gap: 12px;
    border-right: 0; border-bottom: 1px solid var(--line-soft);
    padding: 10px 12px;
  }
  .ft-brand { padding: 0; }
  .ft-nav { flex-direction: row; }
  .ft-user { margin-top: 0; border-top: 0; padding-top: 0; margin-left: auto; }
  .ft-user__row { display: none; }
  .ft-signout { margin-top: 0; width: auto; }
  .ft-main { padding: 20px 14px 40px; }
}
@media (max-width: 480px) {
  .fc-panel {
    right: 12px; left: 12px; bottom: 80px;
    width: auto;
    height: min(440px, calc(100vh - 120px));
  }
  .fc-fab { right: 16px; bottom: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .ft *, .fc *, .fc-panel { transition: none !important; animation: none !important; }
}
`;