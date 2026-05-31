"use client";

// Grid de acciones rápidas para el ticket. Cada botón dispara su handler
// y a la vez registra evento de auditoría. Solo se muestran las acciones
// que el Decision Engine recomienda (weight >= threshold), aunque otras
// quedan accesibles como botones secundarios.

import type { AmsDecisionResult, AmsRecommendedAction } from "@/utils/ams-decision-engine";
import { AMS_ACTION_LABELS } from "@/utils/ams-decision-engine";

interface Props {
  decision: AmsDecisionResult;
  onAction: (action: AmsRecommendedAction) => Promise<void> | void;
  /** Acciones bloqueadas por RBAC, se renderizan deshabilitadas */
  disabledActions?: Set<AmsRecommendedAction>;
}

const ICONS: Record<AmsRecommendedAction, string> = {
  REQUEST_MORE_INFO: "❓",
  SUGGEST_SOLUTION: "💡",
  USE_PLAYBOOK: "📕",
  ESCALATE_N2: "🚨",
  CREATE_JIRA: "↗",
  CREATE_SERVICENOW: "↗",
  GENERATE_RCA: "📄",
  CREATE_TEST_CASE: "🧪",
  CONVERT_TO_KNOWLEDGE: "🧠",
  CREATE_KNOWLEDGE_GAP: "🔍",
  CLOSE_WITH_DOCUMENTATION: "✅",
  WAIT_FOR_USER_CONFIRMATION: "⏳",
  REUSE_PREVIOUS_RESOLUTION: "♻",
  SPLIT_INTO_SUBTASKS: "✂",
  FOLLOW_UP_WITH_USER: "📞",
};

function weightColor(w: number): string {
  if (w >= 80) return "#ef4444";
  if (w >= 60) return "#fbbf24";
  if (w >= 40) return "#22d3ee";
  return "#64748b";
}

export default function TicketQuickActions({ decision, onAction, disabledActions }: Props) {
  if (decision.nextBestActions.length === 0) return null;
  return (
    <div>
      <div className="ticket-section-head">⚡ ACCIONES RÁPIDAS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {decision.nextBestActions.map((a) => {
          const isDisabled = disabledActions?.has(a.action);
          const c = weightColor(a.weight);
          return (
            <button
              key={a.action}
              disabled={isDisabled}
              onClick={() => onAction(a.action)}
              className="btn ghost"
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderLeft: `3px solid ${c}`,
                opacity: isDisabled ? 0.5 : 1,
                display: "flex", flexDirection: "column", gap: 2,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
              title={a.reason}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {ICONS[a.action]} {AMS_ACTION_LABELS[a.action]}
              </span>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{a.reason}</span>
              <span style={{ fontSize: 9.5, color: c, letterSpacing: 1 }}>peso {a.weight}/100</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
