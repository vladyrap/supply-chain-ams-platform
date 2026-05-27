interface Props {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
}

export default function Sparkline({ values, labels, width = 100, height = 40 }: Props) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const lastIdx = values.length - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Tendencia: ${values.join(", ")}`}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#spark-fill)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Punto final */}
      <circle
        cx={lastIdx * stepX}
        cy={height - (values[lastIdx] / max) * (height - 4) - 2}
        r="2.5"
        fill="var(--accent)"
      />
      {labels && labels.length === values.length && (
        <title>{values.map((v, i) => `${labels[i]}: ${v}`).join("\n")}</title>
      )}
    </svg>
  );
}
