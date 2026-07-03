"use client";

// Sparkline minimalista en SVG. Sin dependencias.
// Útil para KPIs: muestra la tendencia reciente en una línea de ~60x18px.

import { useId } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Si true, sombrea el área debajo de la línea. */
  filled?: boolean;
  /** Marca el último punto con un círculo. */
  showLastDot?: boolean;
}

export default function MiniSparkline({
  values, width = 70, height = 22,
  color = "#4589ff", filled = true, showLastDot = true,
}: Props) {
  // useId → ID estable e idéntico en servidor y cliente (Math.random provocaba
  // hydration mismatch: el gradiente tenía distinto id en cada render).
  const reactId = useId();
  if (!values || values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padding + i * step;
    const y = padding + h - ((v - min) / range) * h;
    return [x, y];
  });

  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaD = filled
    ? `${pathD} L ${(padding + w).toFixed(1)} ${(padding + h).toFixed(1)} L ${padding.toFixed(1)} ${(padding + h).toFixed(1)} Z`
    : "";

  const [lx, ly] = points[points.length - 1];

  const gradId = `mini-spark-grad-${reactId.replace(/:/g, "")}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {filled && <path d={areaD} fill={`url(#${gradId})`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {showLastDot && (
        <circle cx={lx} cy={ly} r={2.2} fill={color} stroke="rgba(15,23,42,0.6)" strokeWidth={0.8} />
      )}
    </svg>
  );
}
