"use client";

import type { PermissionAction } from "@/types/rbac";
import { ACTION_LABELS } from "@/types/rbac";

interface Props {
  action: PermissionAction;
  active: boolean;
  size?: "sm" | "md";
}

const ACTION_COLORS: Record<PermissionAction, string> = {
  view:      "#4589ff",
  create:    "#10b981",
  edit:      "#3b82f6",
  delete:    "#fa4d56",
  export:    "#f1c21b",
  configure: "#a855f7",
  approve:   "#f97316",
};

export default function PermissionBadge({ action, active, size = "md" }: Props) {
  const color = ACTION_COLORS[action];
  const pad = size === "sm" ? "2px 6px" : "3px 8px";
  const fz = size === "sm" ? 9.5 : 10.5;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: pad,
      fontSize: fz, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600,
      borderRadius: 4,
      background: active ? `${color}22` : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? color : "rgba(255,255,255,0.08)"}`,
      color: active ? color : "var(--text-dim)",
      textShadow: active ? `0 0 6px ${color}66` : "none",
      transition: "all .15s",
    }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: active ? color : "#475569", boxShadow: active ? `0 0 6px ${color}` : "none" }} />
      {ACTION_LABELS[action]}
    </span>
  );
}
