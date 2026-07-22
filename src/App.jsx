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
  "Where did most of my money go?",
  "Compare June to July",
  "Biggest purchase this month",
];

const CANNED = [
  {
    match: /most|where|top|category/i,
    text: "Food & Dining leads at $289 — that's 23% of your transactions, mostly weekday lunches under $20.",
  },
  {
    match: /compare|june|month|jun|jul/i,
    text: "July is down $296 against June ($1,106 vs $1,402). Shopping dropped the most, from $412 to $178.",
  },
  {
    match: /biggest|largest|highest|expensive/i,
    text: "Your largest purchase in July was $168 at Northgate Home on the 21st, filed under Shopping.",
  },
];

const FALLBACK =
  "I'm a preview — not connected to your transactions yet. Once the API is wired up, I'll answer this for real.";

const replyTo = (text) =>
  CANNED.find((c) => c.match.test(text))?.text ?? FALLBACK;

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

/* ---- responsive ---- */
@media (max-width: 1000px) {
  .ft-row { grid-template-columns: minmax(0, 1fr); }
  .ft-stats { grid-template-columns: repeat(2, 1fr); }
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
