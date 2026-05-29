"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listFeedback, fetchFeedbackStats, fetchConversationTrace,
  type AiFeedback, type FeedbackStats, type FeedbackSource, type FeedbackKind, type ConversationTrace,
} from "@/services/agent-lab.api";
import { supportApi, type SupportConversation } from "@/services/support.api";

type Tab = "feedback" | "replay" | "training";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "feedback", label: "Feedback humano", icon: "👍👎" },
  { id: "replay",   label: "Replay & Debug",  icon: "🎬" },
  { id: "training", label: "Casos para curar", icon: "🎓" },
];

const SOURCE_META: Record<FeedbackSource, { label: string; icon: string; color: string }> = {
  support:     { label: "Mesa Soporte", icon: "📞", color: "#22d3ee" },
  agent_chat:  { label: "Chat agente",  icon: "💬", color: "#a855f7" },
  voice:       { label: "Voz",          icon: "🎙", color: "#10b981" },
  other:       { label: "Otro",         icon: "•",  color: "#64748b" },
};

export default function AgentLabPage() {
  const [tab, setTab] = useState<Tab>("feedback");
  const [stats, setStats] = useState<FeedbackStats | null>(null);

  useEffect(() => {
    fetchFeedbackStats().then((r) => { if (r.ok) setStats(r.stats); });
  }, [tab]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>AGENT · LAB · TRAINING</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>🧪 Agent Lab</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Enseñá al agente: marca 👍/👎 las respuestas, hacé replay de conversaciones con debug detallado y convertí casos en KB.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{stats?.total ?? 0}</div>
              <div className="kanban-stat-lbl">TOTAL FB</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats?.positive ?? 0}</div>
              <div className="kanban-stat-lbl">👍 POSITIVE</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#ef4444" }}>
              <div className="kanban-stat-val">{stats?.negative ?? 0}</div>
              <div className="kanban-stat-lbl">👎 NEGATIVE</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{stats?.positiveRate ?? 0}%</div>
              <div className="kanban-stat-lbl">SATISFACCIÓN</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="row" style={{ gap: 4, marginTop: 14, position: "relative", zIndex: 2 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`kn-tab ${tab === t.id ? "active" : ""}`}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "feedback" && <FeedbackTab />}
      {tab === "replay"   && <ReplayTab />}
      {tab === "training" && <TrainingTab />}
    </div>
  );
}

// ============================================================================
// FEEDBACK TAB
// ============================================================================
function FeedbackTab() {
  const [feedback, setFeedback] = useState<AiFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | FeedbackKind>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | FeedbackSource>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await listFeedback({
      kind:   kindFilter !== "all" ? kindFilter : undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      limit: 200,
    });
    if (r.ok) setFeedback(r.feedback);
    setLoading(false);
  }, [kindFilter, sourceFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>▸</span> FILTROS
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setKindFilter("all")} className={`ticket-filter ${kindFilter === "all" ? "active" : ""}`}
            style={{ ["--filt-color" as never]: "#22d3ee" }}>▸ Todos</button>
          <button onClick={() => setKindFilter("positive")} className={`ticket-filter ${kindFilter === "positive" ? "active" : ""}`}
            style={{ ["--filt-color" as never]: "#10b981" }}>👍 Positivos</button>
          <button onClick={() => setKindFilter("negative")} className={`ticket-filter ${kindFilter === "negative" ? "active" : ""}`}
            style={{ ["--filt-color" as never]: "#ef4444" }}>👎 Negativos</button>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as never)} style={{ minWidth: 160 }}>
            <option value="all">Todos los canales</option>
            <option value="support">📞 Mesa Soporte</option>
            <option value="agent_chat">💬 Chat agente</option>
            <option value="voice">🎙 Voz</option>
          </select>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ padding: "5px 12px", fontSize: 12, marginLeft: "auto" }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻"}
          </button>
        </div>
      </div>

      {loading && feedback.length === 0 && (
        <div className="ticket-list-skeleton">
          {[1, 2, 3].map((i) => <div key={i} className="ticket-skel" />)}
        </div>
      )}

      {!loading && feedback.length === 0 && (
        <div className="ticket-empty">
          <div style={{ fontSize: 44, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 13.5 }}>
            Aún no hay feedback registrado. Apretá 👍/👎 en las respuestas del agente desde la Mesa de Soporte.
          </div>
        </div>
      )}

      <div className="col" style={{ gap: 8 }}>
        {feedback.map((f) => {
          const meta = SOURCE_META[f.source];
          const isPos = f.kind === "positive";
          return (
            <div key={f.id} className="lab-fb-card" style={{ ["--fb-color" as never]: isPos ? "#10b981" : "#ef4444" }}>
              <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span className="lab-fb-icon" style={{ background: isPos ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isPos ? "#10b981" : "#ef4444" }}>
                  {isPos ? "👍" : "👎"}
                </span>
                <span className="kanban-tag" style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}11` }}>
                  {meta.icon} {meta.label}
                </span>
                {f.reason && (
                  <span style={{ fontSize: 11, color: "var(--text-soft)", fontStyle: "italic" }}>
                    "{f.reason}"
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                  {new Date(f.created_at).toLocaleString("es-CL")}
                </span>
              </div>
              {f.query && (
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ QUERY</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-soft)", fontStyle: "italic" }}>
                    "{f.query.slice(0, 200)}{f.query.length > 200 ? "…" : ""}"
                  </div>
                </div>
              )}
              {f.response && (
                <div className="lab-fb-block">
                  <div className="lab-fb-block-head">▸ RESPUESTA</div>
                  <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap", maxHeight: 100, overflow: "auto" }}>
                    {f.response.slice(0, 500)}{f.response.length > 500 ? "…" : ""}
                  </div>
                </div>
              )}
              {f.conversation_id && (
                <Link href={`/agent-lab?conv=${f.conversation_id}`} className="kb-test-link" style={{ marginTop: 6 }}>
                  🎬 ver replay de la conversación →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// REPLAY TAB
// ============================================================================
function ReplayTab() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<ConversationTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  useEffect(() => {
    supportApi.listConversations().then((r) => {
      if ("success" in r && r.success) setConversations(r.conversations);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) { setTrace(null); return; }
    let cancelled = false;
    setTraceLoading(true);
    fetchConversationTrace(selectedId).then((r) => {
      if (cancelled) return;
      if (r.ok) setTrace(r.trace);
      else setTrace(null);
      setTraceLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (!q) return true;
      const hay = [c.user_name, c.user_email, c.summary, c.sap_module].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 50);
  }, [conversations, search]);

  return (
    <div className="ticket-shell">
      <div className="ticket-list-wrap">
        <div className="ticket-list-head">
          <span>Selector de conversación</span>
        </div>
        <div style={{ padding: 10 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación..." style={{ width: "100%", fontSize: 12.5 }} />
        </div>
        <div className="ticket-list">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`ticket-row ${selectedId === c.id ? "active" : ""}`}
              style={{ ["--prio-color" as never]: "#a855f7" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {c.user_name || c.user_email || "(anónimo)"} · {c.channel}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.summary || "(sin resumen)"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>
                  💬 {c.message_count} · {new Date(c.updated_at).toLocaleString().slice(0, 16)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="ticket-detail">
        {!selectedId ? (
          <div className="ticket-empty">
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎬</div>
            <div style={{ fontSize: 13.5, color: "var(--text-soft)", textAlign: "center" }}>
              Seleccioná una conversación para ver el timeline detallado de cómo el agente la procesó.
            </div>
          </div>
        ) : traceLoading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text-soft)" }}>
            <span className="spinner" /> cargando traza…
          </div>
        ) : trace ? (
          <ReplayDetail trace={trace} />
        ) : (
          <div style={{ padding: 30, color: "var(--text-dim)" }}>No se pudo cargar la traza.</div>
        )}
      </div>
    </div>
  );
}

function ReplayDetail({ trace }: { trace: ConversationTrace }) {
  const { conversation: conv, messages, feedback, ticket } = trace;
  const userMessages = messages.filter((m) => m.role === "user").length;
  const aiMessages = messages.filter((m) => m.role === "ai").length;
  const duration = conv.closed_at
    ? new Date(conv.closed_at).getTime() - new Date(conv.created_at).getTime()
    : Date.now() - new Date(conv.created_at).getTime();
  const durationMin = Math.round(duration / 60000);

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Header */}
      <div className="ticket-detail-head">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{conv.user_name || conv.user_email || "(anónimo)"}</h2>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
            conv #{conv.id.slice(0, 8)}
          </div>
        </div>
        <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#c084fc", background: "rgba(168,85,247,0.08)" }}>
          {conv.channel}
        </span>
      </div>

      {/* Timeline stages */}
      <div className="lab-timeline">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>⏱</span> TIMELINE DEL AGENTE
        </div>
        <div className="lab-stage">
          <span className="lab-stage-dot ok" />
          <div style={{ flex: 1 }}>
            <div className="lab-stage-title">INPUT · CONVERSACIÓN INICIADA</div>
            <div className="lab-stage-meta">
              {new Date(conv.created_at).toLocaleString("es-CL")} · canal <b>{conv.channel}</b>
              {conv.client && <> · cliente <b>{conv.client}</b></>}
            </div>
          </div>
        </div>
        <div className="lab-stage">
          <span className="lab-stage-dot ok" />
          <div style={{ flex: 1 }}>
            <div className="lab-stage-title">TRIAGE · IA CLASIFICACIÓN</div>
            <div className="lab-stage-meta">
              módulo <b>{conv.sap_module || "—"}</b> · urgencia <b>{conv.urgency || "—"}</b> · categoría <b>{conv.category || "—"}</b>
            </div>
          </div>
        </div>
        <div className="lab-stage">
          <span className="lab-stage-dot ok" />
          <div style={{ flex: 1 }}>
            <div className="lab-stage-title">MENSAJES · {messages.length} total</div>
            <div className="lab-stage-meta">
              cliente <b>{userMessages}</b> · agente <b>{aiMessages}</b> · sistema <b>{messages.length - userMessages - aiMessages}</b>
            </div>
          </div>
        </div>
        <div className="lab-stage">
          <span className={`lab-stage-dot ${conv.escalated_to_ticket ? "warn" : conv.ai_resolved ? "ok" : "info"}`} />
          <div style={{ flex: 1 }}>
            <div className="lab-stage-title">
              {conv.escalated_to_ticket ? "ESCALADO · TICKET N2"
                : conv.ai_resolved ? "RESUELTO · IA AUTÓNOMA"
                : "EN CURSO"}
            </div>
            <div className="lab-stage-meta">
              {ticket ? <>código <b>{ticket.code}</b> · prio <b>{ticket.priority}</b> · status <b>{ticket.status}</b></>
                      : `${durationMin}m desde inicio`}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>💬</span> TRANSCRIPCIÓN
        </div>
        <div style={{ maxHeight: "40vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              padding: 10,
              background: m.role === "user" ? "rgba(34,211,238,0.08)" : m.role === "system" ? "rgba(251,191,36,0.08)" : "rgba(168,85,247,0.08)",
              borderLeft: `2px solid ${m.role === "user" ? "#22d3ee" : m.role === "system" ? "#fbbf24" : "#a855f7"}`,
              borderRadius: 4,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: "var(--text-dim)", marginBottom: 3 }}>
                {m.role.toUpperCase()} · {new Date(m.created_at).toLocaleTimeString().slice(0, 8)}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <div className="card">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>👥</span> FEEDBACK HUMANO · {feedback.length}
          </div>
          <div className="col" style={{ gap: 6 }}>
            {feedback.map((f) => (
              <div key={f.id} className="row" style={{
                gap: 8, padding: "6px 10px",
                background: f.kind === "positive" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                borderLeft: `2px solid ${f.kind === "positive" ? "#10b981" : "#ef4444"}`,
                borderRadius: 4,
              }}>
                <span>{f.kind === "positive" ? "👍" : "👎"}</span>
                <span style={{ flex: 1, fontSize: 12 }}>
                  {f.reason || <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>(sin razón)</span>}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                  {new Date(f.created_at).toLocaleString().slice(0, 16)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRAINING TAB (casos por curar = negativos sin response al KB todavía)
// ============================================================================
function TrainingTab() {
  const [negatives, setNegatives] = useState<AiFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFeedback({ kind: "negative", limit: 100 }).then((r) => {
      if (r.ok) setNegatives(r.feedback);
      setLoading(false);
    });
  }, []);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "#ef4444" }}>🎓</span> CASOS QUE EL AGENTE RESOLVIÓ MAL
        </div>
        <p className="settings-section-desc">
          Conversaciones marcadas con 👎. Cada uno es una oportunidad de mejora: creá un KB article con la respuesta correcta
          o ajustá los prompts. La IA aprende de tus correcciones.
        </p>
      </div>

      {loading && (
        <div className="ticket-list-skeleton">{[1, 2, 3].map((i) => <div key={i} className="ticket-skel" />)}</div>
      )}

      {!loading && negatives.length === 0 && (
        <div className="ticket-empty">
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 14 }}>
            ¡Cero respuestas negativas! La IA viene resolviendo bien.
          </div>
        </div>
      )}

      <div className="col" style={{ gap: 8 }}>
        {negatives.map((f) => (
          <div key={f.id} className="lab-fb-card" style={{ ["--fb-color" as never]: "#ef4444" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>👎</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {SOURCE_META[f.source].label} · {SOURCE_META[f.source].icon}
                </span>
                {f.reason && (
                  <span className="kanban-tag" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5", background: "rgba(239,68,68,0.10)" }}>
                    {f.reason.slice(0, 50)}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                {new Date(f.created_at).toLocaleString("es-CL")}
              </span>
            </div>

            {f.query && (
              <div className="lab-fb-block">
                <div className="lab-fb-block-head" style={{ color: "#ef4444" }}>▸ QUERY DEL USUARIO</div>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)", fontStyle: "italic" }}>"{f.query.slice(0, 200)}"</div>
              </div>
            )}
            {f.response && (
              <div className="lab-fb-block">
                <div className="lab-fb-block-head" style={{ color: "#ef4444" }}>▸ RESPUESTA QUE FALLÓ</div>
                <div style={{ fontSize: 12, color: "var(--text)", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "auto" }}>
                  {f.response.slice(0, 400)}{f.response.length > 400 ? "…" : ""}
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <Link href="/support-desk/kb" className="btn primary" style={{ fontSize: 11, padding: "5px 10px" }}>
                📘 Crear KB article con la respuesta correcta
              </Link>
              <Link href="/knowledge" className="btn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
                📚 Subir documento relacionado
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
