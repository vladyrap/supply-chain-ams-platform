"use client";

// Grid de acciones rápidas para el ticket. Cada botón dispara su handler
// y a la vez registra evento de auditoría. Solo se muestran las acciones
// que el Decision Engine recomienda (weight >= threshold), aunque otras
// quedan accesibles como botones secundarios.

import type { AmsDecisionResult, AmsRecommendedAction } from "@/utils/ams-decision-engine";
import { AMS_ACTION_LABELS } from "@/utils/ams-decision-engine";
import {
  Zap, HelpCircle, Lightbulb, Book, AlertTriangle, ArrowUpRight, FileText,
  FlaskConical, Brain, Search, CheckCircle2, Loader, RefreshCw, Scissors, Phone,
  type LucideIcon,
} from "lucide-react";

interface Props {
  decision: AmsDecisionResult;
  onAction: (action: AmsRecommendedAction) => Promise<void> | void;
  /** Acciones bloqueadas por RBAC, se renderizan deshabilitadas */
  disabledActions?: Set<AmsRecommendedAction>;
}

const ICONS: Record<AmsRecommendedAction, LucideIcon> = {
  REQUEST_MORE_INFO: HelpCircle,
  SUGGEST_SOLUTION: Lightbulb,
  USE_PLAYBOOK: Book,
  ESCALATE_N2: AlertTriangle,
  CREATE_JIRA: ArrowUpRight,
  CREATE_SERVICENOW: ArrowUpRight,
  GENERATE_RCA: FileText,
  CREATE_TEST_CASE: FlaskConical,
  CONVERT_TO_KNOWLEDGE: Brain,
  CREATE_KNOWLEDGE_GAP: Search,
  CLOSE_WITH_DOCUMENTATION: CheckCircle2,
  WAIT_FOR_USER_CONFIRMATION: Loader,
  REUSE_PREVIOUS_RESOLUTION: RefreshCw,
  SPLIT_INTO_SUBTASKS: Scissors,
  FOLLOW_UP_WITH_USER: Phone,
};

function weightColor(w: number): string {
  if (w >= 80) return "#fa4d56";
  if (w >= 60) return "#f1c21b";
  if (w >= 40) return "#4589ff";
  return "#64748b";
}

export default function TicketQuickActions({ decision, onAction, disabledActions }: Props) {
  if (decision.nextBestActions.length === 0) return null;
  return (
    <div>
      <div className="ticket-section-head"><Zap size={16} /> ACCIONES RÁPIDAS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {decision.nextBestActions.map((a) => {
          const isDisabled = disabledActions?.has(a.action);
          const c = weightColor(a.weight);
          const AIcon = ICONS[a.action];
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
                <AIcon size={14} /> {AMS_ACTION_LABELS[a.action]}
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
