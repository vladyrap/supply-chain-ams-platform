"use client";

// Donut chart en SVG nativo, sin libs.
interface Slice { key: string; value: number; color: string }

interface Props {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

export default function Donut({ data, size = 180, thickness = 24, centerLabel, centerSub }: Props) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((s) => {
    const fraction = s.value / total;
    const dasharray = `${fraction * circumference} ${circumference}`;
    const seg = {
      ...s, fraction,
      dasharray,
      dashoffset: -offset * circumference,
    };
    offset += fraction;
    return seg;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elev)" strokeWidth={thickness} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
            style={{ transition: "stroke-dashoffset 0.4s, stroke-dasharray 0.4s" }}
          >
            <title>{s.key}: {s.value}</title>
          </circle>
        ))}
        {centerLabel && (
          <text x={cx} y={cy - 2} textAnchor="middle" style={{
            fontSize: 22, fontWeight: 700, fill: "var(--text)",
            fontFamily: "ui-sans-serif, sans-serif",
          }}>{centerLabel}</text>
        )}
        {centerSub && (
          <text x={cx} y={cy + 16} textAnchor="middle" style={{
            fontSize: 11, fill: "var(--text-soft)",
          }}>{centerSub}</text>
        )}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        {data.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
            <span style={{ color: "var(--text-soft)", minWidth: 110 }}>{d.key}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{d.value}</span>
            <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
