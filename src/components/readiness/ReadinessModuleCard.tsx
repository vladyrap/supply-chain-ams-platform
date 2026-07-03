"use client";

import type { ReadinessResult } from "@/utils/agent-readiness-engine";
import { READINESS_COLORS } from "@/utils/agent-readiness-engine";
import ReadinessScore from "./ReadinessScore";

interface Props {
  result: ReadinessResult;
}

const MODULE_LABEL: Record<string, string> = {
  MM: "Materials Management",
  SD: "Sales & Distribution",
  PP: "Production Planning",
  EWM: "Extended Warehouse",
  QM: "Quality Management",
  WM: "Warehouse Management",
  ARIBA: "Ariba",
  IBP: "Integrated Business Planning",
  BTP: "Business Tech Platform",
  INTEGRACION: "Integraciones",
};

function bar(label: string, value: number, max: number, color: string) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 24px", gap: 6, alignItems: "center", fontSize: 10.5 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <div style={{
        height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden",
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 300ms ease" }} />
      </div>
      <span style={{ textAlign: "right", color: "var(--text-soft)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function ReadinessModuleCard({ result }: Props) {
  const c = READINESS_COLORS[result.state];
  return (
    <div className="card" style={{ borderLeft: `3px solid ${c}` }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{result.module}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
            {MODULE_LABEL[result.module] ?? result.module}
          </div>
        </div>
        <ReadinessScore score={result.score} state={result.state} />
      </div>
      <div className="col" style={{ gap: 4 }}>
        {bar("Knowledge", result.breakdown.knowledge, 35, "#4589ff")}
        {bar("Q&A",       result.breakdown.qa,        20, "#10b981")}
        {bar("Tests",     result.breakdown.tests,     15, "#a855f7")}
        {bar("Scope",     result.breakdown.scope,     15, "#f1c21b")}
        {bar("Sin gaps",  result.breakdown.lowGaps,   15, "#4589ff")}
      </div>
      {result.hints.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-dim)" }}>
          💡 {result.hints[0]}
        </div>
      )}
    </div>
  );
}
