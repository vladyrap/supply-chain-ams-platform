"use client";

import { AVAILABILITY_LABELS, N2_ROLE_LABELS, type N2Responsible } from "@/types/escalation";
import { maskEmail } from "@/utils/escalation-engine";

const AVAIL_COLORS: Record<string, string> = {
  AVAILABLE: "#86efac",
  ON_CALL:   "#fcd34d",
  BUSY:      "#fdba74",
  OFFLINE:   "#94a3b8",
  VACATION:  "#94a3b8",
};

export default function AssigneeSuggestionCard({
  responsible,
  selected,
  onSelect,
}: {
  responsible: N2Responsible | null | undefined;
  selected?: boolean;
  onSelect?: () => void;
}) {
  if (!responsible) {
    return (
      <div className="card" style={{ borderStyle: "dashed", color: "var(--text-dim)" }}>
        ⚠ Sin sugerencia automática. Asigná manualmente desde el modal de escalamiento.
      </div>
    );
  }
  const loadPct = Math.round(100 * responsible.currentActiveCases / Math.max(1, responsible.maxActiveCases));
  const availColor = AVAIL_COLORS[responsible.availabilityStatus] || "#94a3b8";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card"
      style={{
        width: "100%", textAlign: "left", cursor: onSelect ? "pointer" : "default",
        border: selected ? "1px solid #4589ff" : undefined,
        boxShadow: selected ? "0 0 0 2px rgba(69,137,255,0.20)" : undefined,
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "linear-gradient(135deg, #a855f7, #4589ff)",
          display: "grid", placeItems: "center",
          color: "white", fontWeight: 700, fontSize: 16,
        }}>{responsible.name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{responsible.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
            {N2_ROLE_LABELS[responsible.role]} · {responsible.team}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
            {maskEmail(responsible.email)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: availColor, fontWeight: 700 }}>
            ● {AVAILABILITY_LABELS[responsible.availabilityStatus]}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            carga {responsible.currentActiveCases}/{responsible.maxActiveCases} ({loadPct}%)
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-soft)" }}>
        Módulos: <b>{responsible.sapModules.join(", ") || "—"}</b>
        {responsible.skills?.length ? <> · Skills: {responsible.skills.slice(0, 4).join(", ")}</> : null}
      </div>
    </button>
  );
}
