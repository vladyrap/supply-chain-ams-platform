"use client";

import { TESTING_STATUS_LABELS, type TestingStatus } from "@/types/testing";

const COLORS: Record<TestingStatus, { bg: string; fg: string; bd: string }> = {
  DRAFT:            { bg: "rgba(148,163,184,0.10)", fg: "#cbd5e1", bd: "rgba(148,163,184,0.35)" },
  READY:            { bg: "rgba(56,189,248,0.12)",  fg: "#7dd3fc", bd: "rgba(56,189,248,0.45)" },
  IN_RECORDING:     { bg: "rgba(244,114,182,0.15)", fg: "#f9a8d4", bd: "rgba(244,114,182,0.45)" },
  RECORDED:         { bg: "rgba(168,85,247,0.15)",  fg: "#c084fc", bd: "rgba(168,85,247,0.5)"  },
  SCRIPT_GENERATED: { bg: "rgba(69,137,255,0.12)",  fg: "#67e8f9", bd: "rgba(69,137,255,0.45)" },
  IN_EXECUTION:     { bg: "rgba(241,194,27,0.15)",  fg: "#fcd34d", bd: "rgba(241,194,27,0.5)"  },
  PASSED:           { bg: "rgba(66,190,101,0.15)",   fg: "#86efac", bd: "rgba(66,190,101,0.5)"   },
  FAILED:           { bg: "rgba(250,77,86,0.15)",   fg: "#fca5a5", bd: "rgba(250,77,86,0.5)"   },
  BLOCKED:          { bg: "rgba(168,85,247,0.10)",  fg: "#c084fc", bd: "rgba(168,85,247,0.45)" },
  NEEDS_REWORK:     { bg: "rgba(251,146,60,0.15)",  fg: "#fdba74", bd: "rgba(251,146,60,0.5)"  },
  APPROVED:         { bg: "rgba(66,190,101,0.20)",  fg: "#42be65", bd: "rgba(66,190,101,0.6)"  },
  EXPORTED:         { bg: "rgba(99,102,241,0.15)",  fg: "#a5b4fc", bd: "rgba(99,102,241,0.5)"  },
};

export default function TestingStatusBadge({ status, size = "md" }: { status: TestingStatus; size?: "sm" | "md" }) {
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
      {TESTING_STATUS_LABELS[status]}
    </span>
  );
}
