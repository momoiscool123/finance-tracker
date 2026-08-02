import { Icon } from "./Icon";

export default function StatCard({ label, value, meta, icon, accent }) {
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
