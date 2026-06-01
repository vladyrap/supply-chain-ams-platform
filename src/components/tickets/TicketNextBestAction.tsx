"use client";

// Card destacada con la "Next Best Action" del ticket.
// NO duplica lógica — pinta el output de analyzeTicketDecision() del Decision Engine.
// Los botones disparan callbacks que el caller (TicketCommandCenter) enlaza con los
// QuickActions existentes (escalation, document, testing, etc.) usando refs para scroll
// a la sección correspondiente del Command Center.

import type { AmsDecisionResult, AmsRecommendedAction } from "@/utils/ams-decision-engine";
import { AMS_ACTION_LABELS } from "@/utils/ams-decision-engine";

interface Props {
  decision: AmsDecisionResult;
  onAction: (action: AmsRecommendedAction) => void;
  /** Si Ticket Readiness < 50, se muestra hint. */
  readinessScore?: number;
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

const PRIORITY_COLOR = {
  HIGH: "#ef4444",
  MEDIUM: "#fbbf24",
  LOW: "#22d3ee",
} as const;

// Mapeo informativo de acción → prioridad visual. La prioridad real ya está en weight.
function priorityFromWeight(w: number): keyof typeof PRIORITY_COLOR {
  if (w >= 80) return "HIGH";
  if (w >= 50) return "MEDIUM";
  return "LOW";
}

export default function TicketNextBestAction({ decision, onAction, readinessScore }: Props) {
  const top = decision.nextBestActions[0];
  if (!top) return null;
  const others = decision.nextBestActions.slice(1, 4);
  const priority = priorityFromWeight(top.weight);
  const color = PRIORITY_COLOR[priority];

  return (
    <div className="card" style={{
      borderLeft: `4px solid ${color}`,
      background: `linear-gradient(135deg, ${color}15, transparent 60%)`,
      padding: 14,
    }}>
      <div className="row between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)", marginBottom: 4 }}>
            ▸ NEXT BEST ACTION · sugerido por Decision Engine
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 28 }}>{ICONS[top.action]}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>
                {AMS_ACTION_LABELS[top.action]}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>
                {top.reason}
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10.5, color: "var(--text-dim)" }}>
          <div>Confianza decisión</div>
          <div style={{ color, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{decision.confidence}</div>
          <div style={{ marginTop: 4 }}>peso {top.weight}/100</div>
        </div>
      </div>

      {/* Botón principal + secundarios */}
      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={() => onAction(top.action)}
          className="btn primary"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            borderColor: color, color: "#0b1220",
            padding: "8px 16px", fontSize: 13, fontWeight: 700,
          }}>
          {ICONS[top.action]} {AMS_ACTION_LABELS[top.action]}
        </button>
        {others.map((a) => (
          <button key={a.action} onClick={() => onAction(a.action)}
            className="btn ghost"
            style={{ padding: "6px 12px", fontSize: 11.5 }}
            title={a.reason}>
            {ICONS[a.action]} {AMS_ACTION_LABELS[a.action]}
          </button>
        ))}
      </div>

      {/* Hint adicional: razones top del engine */}
      {decision.reasons.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
          <strong>Por qué:</strong> {decision.reasons.slice(0, 3).join(" · ")}
        </div>
      )}

      {/* Hint cuando Ticket Readiness es bajo y la acción no es REQUEST_MORE_INFO */}
      {typeof readinessScore === "number" && readinessScore < 50
        && top.action !== "REQUEST_MORE_INFO" && (
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 4,
          background: "rgba(251,191,36,0.12)", border: "1px solid #fbbf2444",
          fontSize: 11, color: "#fbbf24",
        }}>
          ⚠ Ticket readiness es bajo ({readinessScore}%). Considerá completar la información antes de avanzar.
        </div>
      )}
    </div>
  );
}
