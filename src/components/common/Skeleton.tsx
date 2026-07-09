"use client";

// =============================================================================
// Skeleton — REDL Fase 4: loaders elegantes (sin spinners/GIF).
// Usa el shimmer definido en globals.css. Superficie navy REDL.
// =============================================================================
import type { CSSProperties } from "react";

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}): React.ReactElement {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(120,169,255,0.06) 25%, rgba(120,169,255,0.14) 37%, rgba(120,169,255,0.06) 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Bloque de card con varias líneas skeleton (para fallbacks de página). */
export function SkeletonCard(): React.ReactElement {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 720,
        width: "100%",
      }}
    >
      <Skeleton width="45%" height={20} />
      <Skeleton width="80%" />
      <Skeleton width="70%" />
      <Skeleton width="60%" />
    </div>
  );
}
