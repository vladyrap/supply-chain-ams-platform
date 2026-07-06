"use client";

// Gauge circular del índice Clean Core (0-100). SVG con anillo de progreso.

import { useId } from "react";
import type { CleanCoreResult } from "@/lib/clean-core/types";

interface Props {
  result: CleanCoreResult;
  size?: number;
}

export default function CleanCoreGauge({ result, size = 168 }: Props) {
  const gradId = useId();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, result.index)) / 100;
  const dash = circumference * pct;
  const color = result.band.color;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-soft, #e0e0e0)" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
          {result.index}
        </div>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 2 }}>
          Índice CC
        </div>
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 700, color,
          padding: "2px 10px", borderRadius: 999,
          background: "color-mix(in srgb, currentColor 14%, transparent)",
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        }}>
          {result.band.label}
        </div>
      </div>
    </div>
  );
}
