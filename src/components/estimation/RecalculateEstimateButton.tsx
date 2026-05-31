"use client";

// Botón pequeño que dispara recálculo. El callback se encarga de la
// estrategia (llamar backend o recalcular client-side y persistir).

import { useState } from "react";

interface Props {
  onRecalculate: () => Promise<void> | void;
  disabled?: boolean;
  label?: string;
}

export default function RecalculateEstimateButton({ onRecalculate, disabled, label = "↻ Recalcular" }: Props) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    if (busy || disabled) return;
    setBusy(true);
    try { await onRecalculate(); } finally { setBusy(false); }
  }
  return (
    <button onClick={handle} disabled={busy || disabled}
      className="btn ghost"
      style={{ padding: "4px 10px", fontSize: 11, opacity: busy ? 0.6 : 1 }}>
      {busy ? "recalculando…" : label}
    </button>
  );
}
