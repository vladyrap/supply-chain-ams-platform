"use client";

import { READINESS_COLORS, READINESS_LABELS, type ReadinessState } from "@/utils/agent-readiness-engine";

interface Props {
  score: number;       // 0-100
  state: ReadinessState;
  size?: number;       // diámetro px
}

export default function ReadinessScore({ score, state, size = 56 }: Props) {
  const c = READINESS_COLORS[state];
  const radius = (size - 6) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={c} strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: c,
      }}>
        <div>{score}</div>
        <div style={{ fontSize: 8, letterSpacing: 1, color: "var(--text-dim)" }}>
          {READINESS_LABELS[state]}
        </div>
      </div>
    </div>
  );
}
