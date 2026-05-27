"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import KPI from "@/components/ui/KPI";
import BarList from "@/components/ui/BarList";
import { supportApi } from "@/services/support.api";

interface MetricsState {
  total: number;
  aiRate: number;
  open: number;
  escalated: number;
  ticketsOpen: number;
  slaBreaches: number;
  kbApproved: number;
  byPriority: { key: string; count: number }[];
  byChannel: { key: string; count: number }[];
}

const PRIORITY_COLOR: Record<string, string> = {
  critica: "var(--error)",
  alta:    "var(--warn)",
  media:   "var(--accent)",
  baja:    "var(--ok)",
};

export default function SupportDeskOverviewPage() {
  const [m, setM] = useState<MetricsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.metrics();
    if (!("success" in r) || !r.success) {
      setError("error" in r ? r.error : "Error");
      setLoading(false);
      return;
    }
    const open = r.conversations.byStatus.find((s) => s.key === "open" || s.key === "ai_handling" || s.key === "waiting_user");
    const escalated = r.conversations.byStatus.find((s) => s.key === "escalated");
    const tktOpen = r.tickets.byStatus.find((s) => s.key === "new" || s.key === "in_progress" || s.key === "waiting_customer");
    const kbApproved = r.kb.byStatus.find((s) => s.key === "approved");
    setM({
      total: r.conversations.total,
      aiRate: r.aiResolution.rate,
      open: (r.conversations.byStatus.filter((s) => ["open", "ai_handling", "waiting_user"].includes(s.key)).reduce((a, b) => a + b.count, 0)) || 0,
      escalated: escalated?.count ?? 0,
      ticketsOpen: r.tickets.byStatus.filter((s) => ["new", "in_progress", "waiting_customer"].includes(s.key)).reduce((a, b) => a + b.count, 0),
      slaBreaches: r.tickets.slaBreaches,
      kbApproved: kbApproved?.count ?? 0,
      byPriority: r.tickets.byPriority,
      byChannel: r.conversations.byChannel,
    });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div>
      <div className="page-title">
        <h1>📞 Mesa de Soporte AMS</h1>
        <p>IA de Nivel 1 que atiende, clasifica, intenta resolver con KB y escala a Nivel 2 si no puede.</p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge variant="ok">backend activo</Badge>
        <Badge variant="tech">Gemini 2.5 Flash + KB curada + RAG fallback</Badge>
        <Badge variant="muted">simulador WhatsApp/Voz</Badge>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Conversaciones totales" value={m?.total ?? "—"} accent="info" />
        <KPI label="% resueltas por IA" value={m ? `${m.aiRate}%` : "—"} accent={m && m.aiRate >= 60 ? "ok" : "warn"} hint="sobre cerradas" />
        <KPI label="Conversaciones abiertas" value={m?.open ?? "—"} accent="tech" />
        <KPI label="Escaladas" value={m?.escalated ?? "—"} accent="warn" />
        <KPI label="Tickets activos N2" value={m?.ticketsOpen ?? "—"} accent="info" />
        <KPI label="SLA vencido" value={m?.slaBreaches ?? "—"} accent={m && m.slaBreaches > 0 ? "warn" : "ok"} />
        <KPI label="KB aprobados" value={m?.kbApproved ?? "—"} accent="ok" />
      </div>

      {/* Acceso rápido */}
      <h2 style={{ fontSize: 16, margin: "8px 0 12px", color: "var(--text-soft)" }}>Accesos</h2>
      <div className="modgrid" style={{ marginBottom: 18 }}>
        <Link href="/support-desk/simulator" className="modcard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="top">
            <span className="ic">💬</span>
            <Badge variant="ok">probar ahora</Badge>
          </div>
          <h3>Simulador</h3>
          <p>Hazte pasar por un cliente vía chat/WhatsApp/voz y prueba el flujo end-to-end.</p>
        </Link>
        <Link href="/support-desk/conversations" className="modcard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="top">
            <span className="ic">📋</span>
            {m && m.open > 0 && <Badge variant="warn">{m.open} abiertas</Badge>}
          </div>
          <h3>Conversaciones</h3>
          <p>Todas las conversaciones del bot con timeline + triage detectado por la IA.</p>
        </Link>
        <Link href="/support-desk/tickets" className="modcard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="top">
            <span className="ic">🎫</span>
            {m && m.ticketsOpen > 0 && <Badge variant="info">{m.ticketsOpen} activos</Badge>}
          </div>
          <h3>Tickets Nivel 2</h3>
          <p>Tickets generados por la IA cuando escala. Cierre con solución alimenta la KB.</p>
        </Link>
        <Link href="/support-desk/kanban" className="modcard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="top">
            <span className="ic">🗂</span>
            <Badge variant="tech">drag &amp; drop</Badge>
          </div>
          <h3>Kanban</h3>
          <p>Tablero visual de tickets con 5 columnas. Arrastra para cambiar el estado en vivo.</p>
        </Link>
        <Link href="/support-desk/kb" className="modcard" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="top">
            <span className="ic">📘</span>
            {m && <Badge variant="ok">{m.kbApproved} aprobados</Badge>}
          </div>
          <h3>Base de Conocimiento</h3>
          <p>Artículos problema → solución aprobados. Es lo primero que consulta la IA.</p>
        </Link>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Tickets por prioridad</h3>
          {m ? (
            <BarList items={m.byPriority.map((p) => ({
              label: p.key, value: p.count, color: PRIORITY_COLOR[p.key] ?? "var(--accent)",
            }))} />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Conversaciones por canal</h3>
          {m ? (
            <BarList items={m.byChannel.map((c) => ({ label: c.key, value: c.count }))} />
          ) : <div style={{ color: "var(--text-dim)" }}>—</div>}
        </div>
      </div>

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <button className="btn ghost" onClick={refresh} disabled={loading}>
          {loading ? <><span className="spinner" /> actualizando</> : "↻ Refrescar métricas"}
        </button>
      </div>
    </div>
  );
}
