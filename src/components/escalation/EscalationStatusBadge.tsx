"use client";

import { ESCALATION_STATUS_LABELS, type EscalationStatus } from "@/types/escalation";

const COLORS: Record<EscalationStatus, { bg: string; fg: string; bd: string }> = {
  NEW:                { bg: "rgba(148,163,184,0.10)", fg: "#cbd5e1", bd: "rgba(148,163,184,0.35)" },
  REVIEW_REQUIRED:    { bg: "rgba(251,191,36,0.15)",  fg: "#fcd34d", bd: "rgba(251,191,36,0.5)"  },
  READY_TO_ESCALATE:  { bg: "rgba(56,189,248,0.15)",  fg: "#7dd3fc", bd: "rgba(56,189,248,0.45)" },
  ESCALATED:          { bg: "rgba(168,85,247,0.15)",  fg: "#c084fc", bd: "rgba(168,85,247,0.5)"  },
  ASSIGNED_TO_N2:     { bg: "rgba(34,211,238,0.12)",  fg: "#67e8f9", bd: "rgba(34,211,238,0.45)" },
  IN_PROGRESS_N2:     { bg: "rgba(59,130,246,0.15)",  fg: "#93c5fd", bd: "rgba(59,130,246,0.5)"  },
  RESOLVED_BY_N2:     { bg: "rgba(34,197,94,0.15)",   fg: "#86efac", bd: "rgba(34,197,94,0.5)"   },
  RETURNED_TO_N1:     { bg: "rgba(244,114,182,0.12)", fg: "#f9a8d4", bd: "rgba(244,114,182,0.45)" },
  CANCELLED:          { bg: "rgba(239,68,68,0.12)",   fg: "#fca5a5", bd: "rgba(239,68,68,0.45)"  },
};

export default function EscalationStatusBadge({ status, size = "md" }: { status: EscalationStatus; size?: "sm" | "md" }) {
  const c = COLORS[status];
  return (
    <span style={{
      display: "inline-block",
      padding: size === "sm" ? "2px 6px" : "3px 9px",
      fontSize: size === "sm" ? 10 : 11,
      fontWeight: 700,
      letterSpacing: 0.3,
      color: c.fg, background: c.bg, border: `1px solid ${c.bd}`,
      borderRadius: 4, textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {ESCALATION_STATUS_LABELS[status]}
    </span>
  );
}
