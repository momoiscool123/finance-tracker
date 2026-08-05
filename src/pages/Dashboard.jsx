import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
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

import StatCard from "../components/StatCard";
import Panel from "../components/Panel";
import ChartTooltip from "../components/ChartTooltip";
import RangeCandle from "../components/RangeCandle";
import { icons } from "../components/Icon";
import {
  CATEGORY_COLORS,
  deriveSummary,
  deriveCategoryBreakdown,
  deriveTimeline,
  deriveRange,
  money,
} from "../data/finance";
import { useTransactions } from "../context/TransactionContext";
import { useCurrentUser } from "../auth";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Placeholder shown inside a chart panel before the user logs any spending,
// so the layout stays put instead of rendering empty axes.
function ChartEmpty({ height = 200 }) {
  return (
    <div
      style={{
        height,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        color: "#7d8590",
        fontSize: 14,
      }}
    >
      Add a transaction to see this chart.
    </div>
  );
}

export default function Dashboard() {
  const [grain, setGrain] = useState("Monthly");
  const [activeSlice, setActiveSlice] = useState(null);
  const { transactions } = useTransactions();
  const user = useCurrentUser();
  const avatarInitial = (user?.name?.[0] || "U").toUpperCase();

  const hasData = transactions.length > 0;

  const SUMMARY = useMemo(() => deriveSummary(transactions), [transactions]);
  const breakdown = useMemo(() => deriveCategoryBreakdown(transactions), [transactions]);
  const timelineAll = useMemo(() => deriveTimeline(transactions), [transactions]);
  const range = useMemo(() => deriveRange(transactions), [transactions]);

  const timeline = timelineAll[grain];
  const rangeSeries = useMemo(
    () => range.map((d) => ({ ...d, range: [d.min, d.max] })),
    [range]
  );

  return (
    <>
      <header className="ft-header">

    <div>

        <p className="ft-greeting">
            {greeting()}
        </p>

        <h1 className="ft-header__title">
            Welcome back, {user?.name || "there"}
        </h1>

        <p className="ft-header__sub">
            Here's an overview of your finances this month.
        </p>

    </div>

    <div className="ft-header__actions">

        <button className="ft-icon-btn" aria-label="Notifications" title="Notifications">
            <Bell size={18} />
        </button>

        <div className="ft-profile">

            <div className="ft-profile__avatar">
                {avatarInitial}
            </div>

        </div>

    </div>

</header>

      <div className="ft-stats">
        <StatCard
          label="Total spent"
          value={money(SUMMARY.totalSpent)}
          meta={SUMMARY.period}
          icon={icons.banknote}
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
          subtitle="Share of spending · all time"
          className="ft-panel--donut"
        >
          {!hasData ? (
            <ChartEmpty />
          ) : (
          <div className="ft-donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={breakdown}
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
                  {breakdown.map((entry, i) => (
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
              {breakdown.map((c) => (
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
          )}
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
          {!hasData ? (
            <ChartEmpty />
          ) : (
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
          )}
        </Panel>
      </div>

      <Panel
        title="Category range analysis"
        subtitle={`${SUMMARY.period} · Candlestick per category showing min · max · average purchase amount`}
      >
        {!hasData ? (
          <ChartEmpty height={260} />
        ) : (
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
              domain={[0, "auto"]}
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
                <Cell key={d.name} fill={CATEGORY_COLORS[d.name]} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        )}

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
    </>
  );
}
