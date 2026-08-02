const BODY_SHARE = 0.76; // body covers the centre 76% of the min–max range

export default function RangeCandle(props) {
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
