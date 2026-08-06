import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

import Panel from "./Panel";

const ACCENT = "#7c5cff";
const GRAINS = ["Daily", "Weekly", "Monthly"];

// Floating value bubble that follows the scrubbed point (like the reference
// design). Giving the Tooltip real content also keeps Recharts' active-point
// tracking alive, which is what drives the live number above the chart.
function ValuePill({ active, payload, money }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: ACCENT,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        boxShadow: "0 6px 16px rgba(124, 92, 255, 0.35)",
        transform: "translateY(-10px)",
      }}
    >
      {money(payload[0].value)}
    </div>
  );
}

/**
 * A modern, "flowy" spending chart. As you move across the curve, the big
 * number above it updates live to the point you're on, and a dashed line + dot
 * track your position — mirroring the reference design.
 *
 * `series` is deriveTimeline(transactions) => { Daily, Weekly, Monthly }, so the
 * chart is driven by real transactions and updates when they change.
 */
export default function SpendingTrend({ series, money }) {
  const [grain, setGrain] = useState("Daily");
  // Which point the user is scrubbing. null = not hovering, so we show the
  // most recent point by default.
  const [hoverIndex, setHoverIndex] = useState(null);

  const data = series[grain] || [];
  const hasData = data.length > 0;

  // Clamp the active index so switching grains (which changes the length) can't
  // point past the end of the new array.
  const activeIndex =
    hoverIndex == null
      ? data.length - 1
      : Math.min(hoverIndex, data.length - 1);
  const active = data[activeIndex];
  const total = data.reduce((sum, d) => sum + d.spend, 0);

  const grainTabs = (
    <div className="ft-segment" role="tablist" aria-label="Time grain">
      {GRAINS.map((g) => (
        <button
          key={g}
          type="button"
          role="tab"
          aria-selected={grain === g}
          className={`ft-segment__btn ${grain === g ? "is-active" : ""}`}
          onClick={() => {
            setGrain(g);
            setHoverIndex(null); // reset the scrubber to the latest point
          }}
        >
          {g}
        </button>
      ))}
    </div>
  );

  return (
    <Panel
      title="Spending trend"
      subtitle="Drag across the graph to inspect any point"
      action={grainTabs}
    >
      {!hasData ? (
        <div
          style={{
            height: 240,
            display: "grid",
            placeItems: "center",
            color: "var(--text-dim)",
            fontSize: 14,
          }}
        >
          Add a transaction to see this chart.
        </div>
      ) : (
        <div style={{ userSelect: "none", WebkitUserSelect: "none" }}>
          {/* Live-updating hero: the number here follows the scrubber. */}
          <div style={{ marginBottom: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}
            >
              {active.label}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {money(active.spend)}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-light)" }}>
              {money(total)} total this range
            </p>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <AreaChart
              data={data}
              margin={{ top: 24, right: 12, bottom: 0, left: 12 }}
              onMouseMove={(state) => {
                // Recharts reports the hovered point here; drive the hero from it.
                const idx = state?.activeTooltipIndex ?? state?.activeIndex;
                if (idx != null && idx !== -1) setHoverIndex(Number(idx));
              }}
              onTouchMove={(state) => {
                const idx = state?.activeTooltipIndex ?? state?.activeIndex;
                if (idx != null && idx !== -1) setHoverIndex(Number(idx));
              }}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                tick={({ x, y, payload }) => {
                  const isActive = payload.value === active.label;
                  return (
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={isActive ? 700 : 400}
                      fill={isActive ? ACCENT : "#7d8590"}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              {/* Hidden Y axis: still needed so the area + marker dot scale
                  correctly. The 1.25x headroom keeps the peak off the ceiling. */}
              <YAxis hide domain={[0, (max) => Math.ceil(max * 1.25)]} />

              {/* The floating value bubble; its presence also makes Recharts
                  track the active point, which drives the number above. */}
              <Tooltip cursor={false} content={<ValuePill money={money} />} />

              <Area
                type="monotone"
                dataKey="spend"
                stroke={ACCENT}
                strokeWidth={3}
                fill="url(#trendFill)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />

              {/* Dashed marker line + dot at the scrubbed point. */}
              <ReferenceLine
                x={active.label}
                stroke={ACCENT}
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
              <ReferenceDot
                x={active.label}
                y={active.spend}
                r={11}
                fill={ACCENT}
                fillOpacity={0.18}
                stroke="none"
              />
              <ReferenceDot
                x={active.label}
                y={active.spend}
                r={5.5}
                fill={ACCENT}
                stroke="#fff"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
