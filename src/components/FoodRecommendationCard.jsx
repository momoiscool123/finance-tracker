import { CATEGORY_LABELS } from "../data/foodChat";

function formatDistance(rec) {
  if (rec.distance_km == null) return "Distance unknown";
  const label = rec.distance_type === "route" ? "by route" : "straight-line";
  const time = rec.travel_time_minutes ? ` (~${rec.travel_time_minutes} min)` : "";
  return `${rec.distance_km} km away, ${label}${time}`;
}

function formatPrice(rec) {
  if (rec.price_range_min != null || rec.price_range_max != null) {
    const currency = rec.currency || "EGP";
    const min = rec.price_range_min != null ? Math.round(rec.price_range_min) : "?";
    const max = rec.price_range_max != null ? Math.round(rec.price_range_max) : "?";
    return `${currency} ${min}–${max} (Google price range)`;
  }
  if (rec.price_level) {
    return `Price level: ${rec.price_level}`;
  }
  return "Price level unavailable";
}

function formatRating(rec) {
  if (rec.rating == null) return "Rating unavailable";
  const reviews = rec.review_count != null ? rec.review_count.toLocaleString() : "0";
  return `${rec.rating.toFixed(1)} ★ from ${reviews} reviews`;
}

export default function FoodRecommendationCard({ rec }) {
  return (
    <article className="fc-food-card">
      <span className="fc-food-card__badge">{CATEGORY_LABELS[rec.category] || rec.category}</span>
      <h4 className="fc-food-card__name">{rec.name}</h4>
      <p className="fc-food-card__meta">
        {rec.cuisine} · {rec.area}
      </p>
      <p className="fc-food-card__address">{rec.address}</p>

      <dl className="fc-food-card__facts">
        <div>
          <dt>Rating</dt>
          <dd>{formatRating(rec)}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatPrice(rec)}</dd>
        </div>
        <div>
          <dt>Open now</dt>
          <dd>{rec.open_now == null ? "Unknown" : rec.open_now ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(rec)}</dd>
        </div>
        <div>
          <dt>Budget fit</dt>
          <dd className={`fc-tag fc-tag--${rec.budget_fit.includes("above") ? "warn" : "ok"}`}>{rec.budget_fit}</dd>
        </div>
        <div>
          <dt>Data confidence</dt>
          <dd className={`fc-tag fc-tag--conf-${rec.data_confidence}`}>{rec.data_confidence}</dd>
        </div>
      </dl>

      <p className="fc-food-card__reason">{rec.reason}</p>

      <a
        className="fc-food-card__maps"
        href={rec.maps_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Google Maps
      </a>
    </article>
  );
}
