export default function ChartTooltip({ active, payload, label, formatter }) {
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
