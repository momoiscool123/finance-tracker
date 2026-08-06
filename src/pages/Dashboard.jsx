import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
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
import SpendingTrend from "../components/SpendingTrend";
import ChartTooltip from "../components/ChartTooltip";
import { icons } from "../components/Icon";
import {
  CATEGORY_COLORS,
  deriveSummary,
  deriveCategoryBreakdown,
  deriveCategoryTotals,
  deriveTimeline,
  spentThisMonth,
  money,
} from "../data/finance";
import { useTransactions } from "../context/TransactionContext";
import { useBudget } from "../context/BudgetContext";
import { useCurrentUser } from "../auth";

// Neutral chart colours that read on both the light and dark theme (the old
// hard-coded near-black grid clashed badly on the light background).
const GRID = "rgba(148,163,184,0.18)";
const AXIS = "#9ba4b0";
const compact = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`);

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ChartEmpty({ height = 200 }) {
  return (
    <div
      style={{
        height,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        color: "var(--text-mute)",
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
  const { spendingLimit } = useBudget();
  const user = useCurrentUser();
  const avatarInitial = (user?.name?.[0] || "U").toUpperCase();

  const hasData = transactions.length > 0;

  const SUMMARY = useMemo(() => deriveSummary(transactions), [transactions]);
  const breakdown = useMemo(() => deriveCategoryBreakdown(transactions), [transactions]);
  const categoryTotals = useMemo(() => deriveCategoryTotals(transactions), [transactions]);
  const timelineAll = useMemo(() => deriveTimeline(transactions), [transactions]);
  const timeline = timelineAll[grain];
  const topCatMax = categoryTotals[0]?.total || 1;

  // Monthly spending limit (set on Bank & limits) — surfaced here too.
  const spentMonth = useMemo(() => spentThisMonth(transactions), [transactions]);
  const hasLimit = spendingLimit > 0;
  const limitPct = hasLimit ? Math.min(100, Math.round((spentMonth / spendingLimit) * 100)) : 0;
  const limitTone = !hasLimit
    ? "coral"
    : spentMonth >= spendingLimit
    ? "red"
    : spentMonth / spendingLimit >= 0.75
    ? "amber"
    : "coral";

  return (
    <>
      <header className="ft-header">
        <div>
          <p className="ft-greeting">{greeting()}</p>
          <h1 className="ft-header__title">Welcome back, {user?.name || "there"}</h1>
          <p className="ft-header__sub">Here's how your money is moving this month.</p>
        </div>

        <div className="ft-header__actions">
          <button className="ft-icon-btn" aria-label="Notifications" title="Notifications">
            <Bell size={18} />
          </button>
          <div className="ft-profile">
            <div className="ft-profile__avatar">{avatarInitial}</div>
          </div>
        </div>
      </header>

      <div className="ft-stats">
        <StatCard label="Total spent" value={money(SUMMARY.totalSpent)} meta={SUMMARY.period} icon={icons.banknote} accent="#2ebd85" />
        <StatCard label="Transactions" value={SUMMARY.transactions} meta="This month" icon={icons.receipt} accent="#7c5cff" />
        <StatCard label="Avg purchase" value={money(SUMMARY.avgPurchase)} meta="Per transaction" icon={icons.bars} accent="#e8a33d" />
        <StatCard label="Top category" value={SUMMARY.topCategory} meta={`${money(SUMMARY.topCategoryTotal)} total`} icon={icons.tag} accent="#f06a8a" />
      </div>

      {/* Signature: the flowy, scrubbable spending trend */}
      <div className="ft-block">
        <SpendingTrend series={timelineAll} money={money} />
      </div>

      <div className="ft-grid ft-grid--2-1">
        <Panel
          title="Spending by period"
          subtitle="Totals with a rolling-average line"
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
            <ChartEmpty height={230} />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={timeline} margin={{ top: 10, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} tickFormatter={compact} width={44} />
                <Tooltip content={<ChartTooltip formatter={(v) => money(v)} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Bar dataKey="spend" name="Spend" fill="#2ebd85" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
                <Line dataKey="avg" name="Average" type="monotone" stroke="#e8a33d" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Where your money goes" subtitle="Share by category">
          {!hasData ? (
            <ChartEmpty height={230} />
          ) : (
            <div className="ft-donut">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                    labelLine={false}
                    isAnimationActive={false}
                    onMouseEnter={(_, i) => setActiveSlice(i)}
                    onMouseLeave={() => setActiveSlice(null)}
                  >
                    {breakdown.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name]}
                        opacity={activeSlice === null || activeSlice === i ? 1 : 0.35}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>

              <ul className="ft-legend">
                {breakdown.map((c) => (
                  <li key={c.name} className="ft-legend__item">
                    <span className="ft-legend__dot" style={{ background: CATEGORY_COLORS[c.name] }} />
                    <span className="ft-legend__name">{c.name}</span>
                    <span className="ft-legend__val">{c.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="ft-grid ft-grid--1-1">
        <Panel title="Top spending categories" subtitle="Where you spend the most">
          {!hasData ? (
            <ChartEmpty height={180} />
          ) : (
            <ul className="ft-catbars">
              {categoryTotals.map((c) => (
                <li key={c.name} className="ft-catbar">
                  <div className="ft-catbar__head">
                    <span className="ft-catbar__name">
                      <span className="ft-catbar__dot" style={{ background: CATEGORY_COLORS[c.name] }} />
                      {c.name}
                    </span>
                    <span className="ft-catbar__amt">{money(c.total)}</span>
                  </div>
                  <div className="ft-catbar__track">
                    <span
                      className="ft-catbar__fill"
                      style={{
                        width: `${Math.max((c.total / topCatMax) * 100, 3)}%`,
                        background: CATEGORY_COLORS[c.name],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="This month's budget" subtitle={SUMMARY.period}>
          {hasLimit ? (
            <>
              <div className="bg-meta">
                <span>{money(spentMonth)} spent</span>
                <span>{money(spendingLimit)} limit</span>
              </div>
              <div className="bg-bar bg-bar--lg">
                <div
                  className={`bg-bar__fill bg-bar__fill--${limitTone}`}
                  style={{ width: `${limitPct}%` }}
                />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-light)" }}>
                {spentMonth >= spendingLimit
                  ? `You're ${money(spentMonth - spendingLimit)} over your limit this month.`
                  : `${money(spendingLimit - spentMonth)} left of your ${money(spendingLimit)} limit this month.`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-light)" }}>
              No monthly limit set yet.{" "}
              <Link to="/budget" style={{ color: "var(--accent)", fontWeight: 600 }}>
                Set one in Bank &amp; limits
              </Link>{" "}
              to track it here.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
