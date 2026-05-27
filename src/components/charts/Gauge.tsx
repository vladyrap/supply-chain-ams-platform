"use client";

interface Props {
  value: number;   // 0-100
  size?: number;
  label?: string;
  sub?: string;
  thickness?: number;
}

function colorForValue(v: number): string {
  if (v >= 80) return "var(--ok)";
  if (v >= 50) return "var(--warn)";
  return "var(--error)";
}

export default function Gauge({ value, size = 180, label, sub, thickness = 16 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Semicírculo (arco de 180°)
  const circumference = Math.PI * r;
  const fillLen = (clamped / 100) * circumference;
  const color = colorForValue(clamped);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Track */}
        <path
          d={`M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke="var(--bg-elev)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${thickness / 2} ${cy} A ${r} ${r} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${fillLen} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
        />
        {/* Texto centro */}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{
          fontSize: 28, fontWeight: 700, fill: color,
          fontFamily: "ui-sans-serif, sans-serif",
        }}>{clamped}%</text>
        {sub && (
          <text x={cx} y={cy + 14} textAnchor="middle" style={{
            fontSize: 11, fill: "var(--text-dim)",
          }}>{sub}</text>
        )}
      </svg>
      {label && (
        <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: -4 }}>{label}</div>
      )}
    </div>
  );
}
