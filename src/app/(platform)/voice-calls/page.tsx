"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { listVoiceCalls, type VoiceCall } from "@/services/voice.api";

const POLL_MS = 8000;

const STATUS_VARIANT: Record<string, "ok" | "warn" | "info" | "error" | "muted"> = {
  completed:    "ok",
  "in-progress": "info",
  ringing:      "info",
  busy:         "warn",
  failed:       "error",
  "no-answer":   "warn",
  canceled:     "muted",
};

function fmtDuration(sec: number | null): string {
  if (!sec || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60)   return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60)   return `hace ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24)   return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function looksDerivedToHuman(ai: string | null): boolean {
  if (!ai) return false;
  return /derivo|deriv[ao]r|especialista|escalad[ao]|nivel 2|nivel dos|humano/i.test(ai);
}

function Tile({ label, value, hint, accent = "#4589ff" }: { label: string; value: string | number; hint?: string; accent?: string }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accent}`, padding: 14 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 8px ${accent}55` }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export default function VoiceCallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    async function tick() {
      const r = await listVoiceCalls(200);
      if (!alive) return;
      if (r.ok) { setCalls(r.calls); setError(null); }
      else      { setError(r.error); }
      setLoading(false);
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // KPIs computados client-side
  const kpis = useMemo(() => {
    const total = calls.length;
    const today = calls.filter((c) => isToday(c.started_at)).length;
    const durations = calls.map((c) => c.duration_seconds).filter((d): d is number => typeof d === "number" && d > 0);
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const derived = calls.filter((c) => looksDerivedToHuman(c.ai_responses)).length;
    const derivedPct = total ? Math.round((derived / total) * 100) : 0;
    const inProgress = calls.filter((c) => c.call_status === "in-progress" || c.call_status === "ringing").length;
    const failed     = calls.filter((c) => c.call_status === "failed" || c.call_status === "busy").length;
    return { total, today, avg, derivedPct, inProgress, failed };
  }, [calls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (statusFilter !== "all" && c.call_status !== statusFilter) return false;
      if (!q) return true;
      const hay = [c.call_sid, c.from_number, c.to_number, c.transcript, c.ai_responses]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [calls, statusFilter, search]);

  const distinctStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const c of calls) if (c.call_status) set.add(c.call_status);
    return Array.from(set).sort();
  }, [calls]);

  return (
    <div>
      <div className="page-title">
        <h1>📞 Canal Telefónico IA</h1>
        <p>
          Llamadas entrantes atendidas por el agente AMS vía Twilio Voice. Reconocimiento de voz + respuesta sintetizada
          en español. Sin audio almacenado — solo transcripción. Polling cada {POLL_MS / 1000}s.
        </p>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 14 }}>
        <Tile label="Total"         value={kpis.total}            accent="#3b82f6" />
        <Tile label="Hoy"           value={kpis.today}            accent="#10b981" hint={kpis.today ? "llamadas del día" : "sin llamadas hoy"} />
        <Tile label="En curso"      value={kpis.inProgress}       accent={kpis.inProgress ? "#f1c21b" : "#6b7280"} />
        <Tile label="Duración avg"  value={fmtDuration(kpis.avg)} accent="#a855f7" hint="solo finalizadas" />
        <Tile label="% Derivadas"   value={`${kpis.derivedPct}%`} accent="#06b6d4" hint="IA derivó a humano" />
        <Tile label="Fallidas"      value={kpis.failed}           accent={kpis.failed ? "#fa4d56" : "#6b7280"} hint="busy/failed" />
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="all">Todos los estados ({calls.length})</option>
            {distinctStatuses.map((s) => (
              <option key={s} value={s}>{s} ({calls.filter((c) => c.call_status === s).length})</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en call_sid, número o transcript…"
            style={{ flex: 1, minWidth: 220 }}
          />
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{filtered.length} de {calls.length}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="card flat" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-soft)", textAlign: "left", color: "var(--text-dim)" }}>
              <th style={{ padding: "10px 12px" }}>Inicio</th>
              <th style={{ padding: "10px 12px" }}>Estado</th>
              <th style={{ padding: "10px 12px" }}>De → A</th>
              <th style={{ padding: "10px 12px" }}>Duración</th>
              <th style={{ padding: "10px 12px" }}>Resumen</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>cargando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>
                {calls.length === 0 ? "Aún no hay llamadas. Configura el webhook de Twilio para empezar a recibir." : "Ningún resultado para el filtro actual."}
              </td></tr>
            )}
            {filtered.map((c) => {
              const variant = STATUS_VARIANT[c.call_status ?? ""] ?? "muted";
              const summary = (c.transcript || "").split("\n").filter(Boolean).slice(0, 1).join(" ").replace(/^\[USER\]\s?/, "").trim();
              const derived = looksDerivedToHuman(c.ai_responses);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 12 }}>{new Date(c.started_at).toLocaleTimeString()}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{fmtRelative(c.started_at)}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Badge variant={variant}>{c.call_status ?? "?"}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono, monospace)", fontSize: 11.5 }}>
                    <div>{c.from_number ?? "—"}</div>
                    <div style={{ color: "var(--text-dim)" }}>→ {c.to_number ?? "—"}</div>
                  </td>
                  <td style={{ padding: "10px 12px", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(c.duration_seconds)}</td>
                  <td style={{ padding: "10px 12px", maxWidth: 360 }}>
                    {summary
                      ? <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.transcript ?? ""}>{summary}</div>
                      : <span style={{ color: "var(--text-dim)" }}>(sin transcript)</span>}
                    {derived && <div style={{ marginTop: 4 }}><Badge variant="warn">derivada a humano</Badge></div>}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <Link href={`/voice-calls/${encodeURIComponent(c.call_sid)}`} className="btn ghost" style={{ padding: "3px 10px", fontSize: 11 }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
