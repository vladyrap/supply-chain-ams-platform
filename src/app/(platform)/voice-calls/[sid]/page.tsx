"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { getVoiceCall, type VoiceCall, type VoiceTurn } from "@/services/voice.api";

const POLL_MS = 5000;

const SPEAKER_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  USER:   { label: "Cliente",   color: "#3b82f6", icon: "🗣" },
  AI:     { label: "Agente IA", color: "#a855f7", icon: "🤖" },
  SYSTEM: { label: "Sistema",   color: "#64748b", icon: "⚙" },
};

function fmtDuration(sec: number | null): string {
  if (!sec || sec < 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function statusVariant(s: string | null): "ok" | "warn" | "info" | "error" | "muted" {
  if (s === "completed") return "ok";
  if (s === "in-progress" || s === "ringing") return "info";
  if (s === "busy" || s === "no-answer") return "warn";
  if (s === "failed") return "error";
  return "muted";
}

export default function VoiceCallDetailPage() {
  const params = useParams<{ sid: string }>();
  const sid = decodeURIComponent(params.sid || "");
  const [call, setCall] = useState<VoiceCall | null>(null);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sid) return;
    let alive = true;
    async function tick() {
      const r = await getVoiceCall(sid);
      if (!alive) return;
      if (r.ok) { setCall(r.call); setTurns(r.turns); setError(null); }
      else      { setError(r.error); }
      setLoading(false);
    }
    tick();
    // poll mientras la llamada está activa, suficientemente lento si ya terminó
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [sid]);

  if (loading) return <div style={{ padding: 30, color: "var(--text-dim)" }}>cargando…</div>;
  if (error || !call) {
    return (
      <div>
        <Link href="/voice-calls" className="btn ghost" style={{ fontSize: 12 }}>← Volver</Link>
        <div className="alert error" style={{ marginTop: 12 }}>{error ?? "Llamada no encontrada"}</div>
      </div>
    );
  }

  const variant = statusVariant(call.call_status);
  const ended = !!call.ended_at;

  return (
    <div>
      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <Link href="/voice-calls" className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }}>← Llamadas</Link>
        <h1 style={{ margin: 0, fontSize: 20, letterSpacing: 1 }}>📞 Detalle de llamada</h1>
        <Badge variant={variant}>{call.call_status ?? "?"}</Badge>
        {!ended && <span style={{ fontSize: 11, color: "#10b981" }}>● en vivo</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 14 }}>
        {/* Datos de la llamada */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 13, letterSpacing: 1.5, color: "var(--text-soft)" }}>▼ DATOS DE LA LLAMADA</h3>
          <Row label="Call SID"  value={<code style={{ fontSize: 11 }}>{call.call_sid}</code>} />
          <Row label="De"        value={<code style={{ fontFamily: "var(--font-mono, monospace)" }}>{call.from_number ?? "—"}</code>} />
          <Row label="A"         value={<code style={{ fontFamily: "var(--font-mono, monospace)" }}>{call.to_number ?? "—"}</code>} />
          <Row label="Inicio"    value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(call.started_at).toLocaleString("es-CL")}</span>} />
          <Row label="Fin"       value={call.ended_at ? <span style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(call.ended_at).toLocaleString("es-CL")}</span> : <span style={{ color: "var(--text-dim)" }}>—</span>} />
          <Row label="Duración"  value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDuration(call.duration_seconds)}</span>} />
          <Row label="Turnos"    value={`${turns.length} mensajes`} />
        </div>

        {/* Resumen transcript / ai */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 13, letterSpacing: 1.5, color: "var(--text-soft)" }}>▼ RESUMEN TEXTUAL</h3>
          <div style={{ fontSize: 11, color: "#3b82f6", marginBottom: 4, letterSpacing: 1.2 }}>USUARIO DIJO</div>
          <pre style={{ background: "rgba(59,130,246,0.06)", padding: 10, borderRadius: 4, fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto", margin: 0 }}>
            {call.transcript || "(vacío)"}
          </pre>
          <div style={{ fontSize: 11, color: "#a855f7", margin: "10px 0 4px", letterSpacing: 1.2 }}>IA RESPONDIÓ</div>
          <pre style={{ background: "rgba(168,85,247,0.06)", padding: 10, borderRadius: 4, fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto", margin: 0 }}>
            {call.ai_responses || "(vacío)"}
          </pre>
        </div>
      </div>

      {/* Timeline */}
      <div className="card flat" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 13, letterSpacing: 1.5, color: "var(--text-soft)" }}>▼ TIMELINE DE TURNOS</h3>
        {turns.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>(sin turnos registrados)</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {turns.map((t, i) => {
            const meta = SPEAKER_LABEL[t.speaker] ?? SPEAKER_LABEL.SYSTEM;
            const prevTime = i > 0 ? new Date(turns[i - 1].created_at).getTime() : null;
            const thisTime = new Date(t.created_at).getTime();
            const gapMs = prevTime ? thisTime - prevTime : null;
            return (
              <div key={t.id} style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 60, flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Date(t.created_at).toLocaleTimeString().slice(0, 8)}
                  </div>
                  {gapMs !== null && gapMs > 0 && (
                    <div style={{ fontSize: 9.5, color: "var(--text-dim)" }}>+{(gapMs / 1000).toFixed(1)}s</div>
                  )}
                </div>
                <div style={{ flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${meta.color}`, borderRadius: 4 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{meta.icon}</span>
                    <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, letterSpacing: 1 }}>{meta.label}</span>
                    <span style={{ fontSize: 9.5, color: "var(--text-dim)", textTransform: "uppercase" }}>{t.speaker}</span>
                  </div>
                  <div style={{ fontSize: 13, color: t.speaker === "SYSTEM" ? "var(--text-dim)" : "var(--text)", whiteSpace: "pre-wrap", fontStyle: t.speaker === "SYSTEM" ? "italic" : "normal" }}>
                    {t.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata raw (debug) */}
      {Object.keys(call.metadata || {}).length > 0 && (
        <details className="card flat" style={{ padding: 12, marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)" }}>▶ metadata raw</summary>
          <pre style={{ fontSize: 11, color: "var(--text-soft)", overflowX: "auto", marginTop: 8 }}>
            {JSON.stringify(call.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row between" style={{ padding: "5px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)", fontSize: 12.5 }}>
      <span style={{ color: "var(--text-dim)", letterSpacing: 0.5 }}>{label}</span>
      <span style={{ color: "var(--text)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
