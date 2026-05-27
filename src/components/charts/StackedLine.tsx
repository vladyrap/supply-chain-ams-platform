"use client";

// Línea apilada / multi-serie en SVG
interface Series { name: string; color: string; values: number[] }

interface Props {
  labels: string[];
  series: Series[];
  height?: number;
}

export default function StackedLine({ labels, series, height = 140 }: Props) {
  const width = Math.max(labels.length * 38, 320);
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const stepX = width / Math.max(labels.length - 1, 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height + 30} viewBox={`0 0 ${width} ${height + 30}`}>
        {/* eje x labels */}
        {labels.map((l, i) => i % 2 === 0 ? (
          <text key={i}
            x={i * stepX}
            y={height + 20}
            style={{ fontSize: 10, fill: "var(--text-dim)" }}
            textAnchor="middle">
            {l.slice(5)}
          </text>
        ) : null)}

        {/* líneas */}
        {series.map((s, si) => {
          const points = s.values.map((v, i) => {
            const x = i * stepX;
            const y = height - (v / max) * (height - 8) - 4;
            return `${x},${y}`;
          }).join(" ");
          return (
            <g key={si}>
              <polyline points={points} fill="none" stroke={s.color}
                strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i}
                  cx={i * stepX}
                  cy={height - (v / max) * (height - 8) - 4}
                  r={2}
                  fill={s.color}>
                  <title>{labels[i]} · {s.name}: {v}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {/* leyenda */}
      <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 11.5, flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-soft)" }}>
            <span style={{ width: 10, height: 10, background: s.color, borderRadius: 2 }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
