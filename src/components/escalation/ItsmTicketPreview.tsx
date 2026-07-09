"use client";

import type { ItsmTicketPayload } from "@/types/escalation";

export default function ItsmTicketPreview({ payload }: { payload: ItsmTicketPayload | null | undefined }) {
  if (!payload) {
    return (
      <div className="card" style={{ borderStyle: "dashed", color: "var(--text-dim)", fontSize: 12 }}>
        Sin payload generado. Se construirá al elegir canal.
      </div>
    );
  }
  const title =
    payload.channel === "JIRA" ? "🟦 Payload Jira"
    : payload.channel === "SERVICENOW" ? "🟧 Payload ServiceNow"
    : "✉️ Mensaje manual";

  return (
    <div className="card" style={{ background: "rgba(15,23,42,0.50)" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ fontSize: 10.5, color: "#fcd34d", fontWeight: 700 }}>preview</div>
      </div>
      <pre style={{
        margin: 0, padding: "10px 12px",
        background: "rgba(0,0,0,0.30)", borderRadius: 6,
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 11.5, lineHeight: 1.5, color: "#a5f3fc",
        maxHeight: 280, overflowY: "auto",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
{JSON.stringify(payload.payload, null, 2)}
      </pre>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6 }}>
        Este payload sólo se envía cuando confirmás explícitamente. En modo DEMO no toca ningún sistema externo.
      </div>
    </div>
  );
}
