"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import AgentReadinessCenter from "@/components/readiness/AgentReadinessCenter";

export default function AgentReadinessPage() {
  return (
    <RequirePermission
      screen="agent_readiness"
      reason="Agent Readiness Center requiere rol con permiso de visualización."
    >
      <div>
        <div className="sd-hero">
          <span className="id-tc tl" /><span className="id-tc tr" /><span className="id-tc bl" /><span className="id-tc br" />
          <div className="sd-hero-grid" />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>AGENT · READINESS · CENTER</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>🎯 Agent Readiness Center</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Score 0–100 de cobertura del agente por módulo SAP: knowledge publicado, Q&amp;A aprobadas, casos de prueba, scope items cubiertos, sin brechas.
            </p>
          </div>
        </div>
        <AgentReadinessCenter />
      </div>
    </RequirePermission>
  );
}
