"use client";

import Link from "next/link";
import ChatPanel from "@/components/agent/ChatPanel";
import Badge from "@/components/ui/Badge";

export default function AgentPage() {
  return (
    <div>
      <div className="page-title">
        <h1>Agente AMS</h1>
        <p>
          Diagnóstico, RCA y paso a paso para incidentes SAP Supply Chain. Habla o escribe — el
          texto se envía al backend del agente (puerto 6601).
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge variant="ok">activo</Badge>
        <Badge variant="tech">Modo voz local</Badge>
        <Badge variant="info">12 bloques estructurados</Badge>
        <Badge variant="muted">no ejecuta cambios en SAP</Badge>
        <Link href="/agent/think" className="btn ghost" style={{ marginLeft: "auto", padding: "4px 12px", textDecoration: "none" }}>
          🧠 ver pensando
        </Link>
        <Link href="/agent/voice" className="btn ghost" style={{ padding: "4px 12px", textDecoration: "none" }}>
          🎙 modo voz →
        </Link>
      </div>

      <ChatPanel />
    </div>
  );
}
