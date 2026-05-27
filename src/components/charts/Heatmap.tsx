"use client";

// Heatmap día de la semana × hora del día (estilo GitHub contributions)
interface Cell { day: number; hour: number; value: number }

interface Props {
  data: Cell[];
  cellSize?: number;
  gap?: number;
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function colorFor(value: number, max: number): string {
  if (value === 0) return "var(--bg-elev)";
  const t = Math.min(1, value / Math.max(max, 1));
  // Gradiente de accent transparente a opaco
  if (t < 0.25) return "rgba(91, 141, 239, 0.25)";
  if (t < 0.5)  return "rgba(91, 141, 239, 0.50)";
  if (t < 0.75) return "rgba(91, 141, 239, 0.75)";
  return "rgba(91, 141, 239, 1)";
}

export default function Heatmap({ data, cellSize = 14, gap = 3 }: Props) {
  // Indexar por day-hour
  const map = new Map<string, number>();
  let max = 0;
  for (const c of data) {
    map.set(`${c.day}-${c.hour}`, c.value);
    if (c.value > max) max = c.value;
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const days = Array.from({ length: 7 }, (_, d) => d);

  const totalWidth  = 36 + (cellSize + gap) * 24;
  const totalHeight = (cellSize + gap) * 7 + 24;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={totalWidth} height={totalHeight} role="img" aria-label="Heatmap actividad">
        {/* labels horas */}
        {[0, 4, 8, 12, 16, 20].map((h) => (
          <text key={h}
            x={36 + h * (cellSize + gap)}
            y={10}
            style={{ fontSize: 10, fill: "var(--text-dim)" }}>
            {h}h
          </text>
        ))}
        {/* labels días + celdas */}
        {days.map((d) => (
          <g key={d}>
            <text x={0} y={20 + d * (cellSize + gap) + cellSize / 2 + 2}
              style={{ fontSize: 10, fill: "var(--text-dim)" }}>
              {DAYS[d]}
            </text>
            {hours.map((h) => {
              const value = map.get(`${d}-${h}`) ?? 0;
              return (
                <rect
                  key={h}
                  x={36 + h * (cellSize + gap)}
                  y={20 + d * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  fill={colorFor(value, max)}
                  rx={2}
                  style={{ transition: "fill 0.3s" }}
                >
                  <title>{DAYS[d]} {h}:00 — {value} eventos</title>
                </rect>
              );
            })}
          </g>
        ))}
        {/* leyenda */}
        <g transform={`translate(${36}, ${20 + 7 * (cellSize + gap) + 6})`}>
          <text x={0} y={10} style={{ fontSize: 10, fill: "var(--text-dim)" }}>menos</text>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <rect key={i} x={42 + i * 14} y={2} width={10} height={10}
              fill={colorFor(t * max || (t === 0 ? 0 : 1), max)} rx={2} />
          ))}
          <text x={42 + 5 * 14 + 4} y={10} style={{ fontSize: 10, fill: "var(--text-dim)" }}>más</text>
        </g>
      </svg>
    </div>
  );
}
