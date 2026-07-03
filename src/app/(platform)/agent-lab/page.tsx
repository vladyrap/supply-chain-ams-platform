"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listFeedback, fetchFeedbackStats, fetchConversationTrace,
  fetchConvertibleTickets, generateWizardDraft, commitWizardArticle,
  runPlaygroundQuery,
  adoptPlaygroundPrompt, fetchActivePrompt,
  type AiFeedback, type FeedbackStats, type FeedbackSource, type FeedbackKind, type ConversationTrace,
  type ConvertibleTicket, type KbDraft, type DraftResult, type PlaygroundRunResult,
  type PromptVersion,
} from "@/services/agent-lab.api";
import { supportApi, type SupportConversation } from "@/services/support.api";
import MarkdownView from "@/components/agent/MarkdownView";
import RequirePermission from "@/components/admin/RequirePermission";

type Tab = "feedback" | "replay" | "training" | "wizard" | "playground";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "feedback",   label: "Feedback humano",  icon: "👍👎" },
  { id: "replay",     label: "Replay & Debug",   icon: "🎬" },
  { id: "training",   label: "Casos para curar", icon: "🎓" },
  { id: "wizard",     label: "Wizard KB",        icon: "🪄" },
  { id: "playground", label: "Prompt Playground", icon: "🎛" },
];

const SOURCE_META: Record<FeedbackSource, { label: string; icon: string; color: string }> = {
  support:     { label: "Mesa Soporte", icon: "📞", color: "#4589ff" },
  agent_chat:  { label: "Chat agente",  icon: "💬", color: "#a855f7" },
  voice:       { label: "Voz",          icon: "🎙", color: "#10b981" },
  other:       { label: "Otro",         icon: "•",  color: "#64748b" },
};

function AgentLabPageInner() {
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
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{stats?.total ?? 0}</div>
              <div className="kanban-stat-lbl">TOTAL FB</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats?.positive ?? 0}</div>
              <div className="kanban-stat-lbl">👍 POSITIVE</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#fa4d56" }}>
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

      {tab === "feedback"   && <FeedbackTab />}
      {tab === "replay"     && <ReplayTab />}
      {tab === "training"   && <TrainingTab />}
      {tab === "wizard"     && <WizardTab />}
      {tab === "playground" && <PlaygroundTab />}
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
            style={{ ["--filt-color" as never]: "#4589ff" }}>▸ Todos</button>
          <button onClick={() => setKindFilter("positive")} className={`ticket-filter ${kindFilter === "positive" ? "active" : ""}`}
            style={{ ["--filt-color" as never]: "#10b981" }}>👍 Positivos</button>
          <button onClick={() => setKindFilter("negative")} className={`ticket-filter ${kindFilter === "negative" ? "active" : ""}`}
            style={{ ["--filt-color" as never]: "#fa4d56" }}>👎 Negativos</button>
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
            <div key={f.id} className="lab-fb-card" style={{ ["--fb-color" as never]: isPos ? "#10b981" : "#fa4d56" }}>
              <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span className="lab-fb-icon" style={{ background: isPos ? "rgba(16,185,129,0.15)" : "rgba(250,77,86,0.15)", color: isPos ? "#10b981" : "#fa4d56" }}>
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
              background: m.role === "user" ? "rgba(69,137,255,0.08)" : m.role === "system" ? "rgba(241,194,27,0.08)" : "rgba(168,85,247,0.08)",
              borderLeft: `2px solid ${m.role === "user" ? "#4589ff" : m.role === "system" ? "#f1c21b" : "#a855f7"}`,
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
                background: f.kind === "positive" ? "rgba(16,185,129,0.08)" : "rgba(250,77,86,0.08)",
                borderLeft: `2px solid ${f.kind === "positive" ? "#10b981" : "#fa4d56"}`,
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
          <span style={{ color: "#fa4d56" }}>🎓</span> CASOS QUE EL AGENTE RESOLVIÓ MAL
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
          <div key={f.id} className="lab-fb-card" style={{ ["--fb-color" as never]: "#fa4d56" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>👎</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {SOURCE_META[f.source].label} · {SOURCE_META[f.source].icon}
                </span>
                {f.reason && (
                  <span className="kanban-tag" style={{ borderColor: "rgba(250,77,86,0.4)", color: "#fca5a5", background: "rgba(250,77,86,0.10)" }}>
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
                <div className="lab-fb-block-head" style={{ color: "#fa4d56" }}>▸ QUERY DEL USUARIO</div>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)", fontStyle: "italic" }}>"{f.query.slice(0, 200)}"</div>
              </div>
            )}
            {f.response && (
              <div className="lab-fb-block">
                <div className="lab-fb-block-head" style={{ color: "#fa4d56" }}>▸ RESPUESTA QUE FALLÓ</div>
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

// ============================================================================
// WIZARD TAB · ticket resuelto → KB article via Gemini
// ============================================================================
function WizardTab() {
  const [tickets, setTickets] = useState<ConvertibleTicket[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editing, setEditing] = useState<KbDraft | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConvertibleTickets().then((r) => {
      if (r.ok) setTickets(r.tickets);
      setLoadingList(false);
    });
  }, []);

  async function regenerate(ticketId: string) {
    setError(null);
    setCommitted(null);
    setDraftLoading(true);
    setSelectedId(ticketId);
    const r = await generateWizardDraft(ticketId);
    setDraftLoading(false);
    if (r.ok) {
      setDraftResult(r.result);
      setEditing({ ...r.result.draft });
    } else {
      setError(r.error);
      setDraftResult(null);
      setEditing(null);
    }
  }

  async function save() {
    if (!editing || !draftResult) return;
    setError(null);
    setCommitting(true);
    const r = await commitWizardArticle({
      ticketId: draftResult.ticket.id,
      title: editing.title,
      problem: editing.problem,
      solution: editing.solution,
      category: editing.category,
      system: editing.system,
      tags: editing.tags,
    });
    setCommitting(false);
    if (r.ok) {
      setCommitted({ id: r.article.id, title: r.article.title });
      // refrescar lista para que aparezca has_kb=true
      fetchConvertibleTickets().then((rr) => { if (rr.ok) setTickets(rr.tickets); });
    } else {
      setError(r.error);
    }
  }

  function addTag() {
    if (!editing || !tagDraft.trim()) return;
    const t = tagDraft.trim().toLowerCase();
    if (editing.tags.includes(t)) { setTagDraft(""); return; }
    setEditing({ ...editing, tags: [...editing.tags, t].slice(0, 8) });
    setTagDraft("");
  }
  function removeTag(t: string) {
    if (!editing) return;
    setEditing({ ...editing, tags: editing.tags.filter((x) => x !== t) });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (!q) return true;
      return [t.code, t.title, t.summary, t.sap_module, t.client].filter(Boolean).join(" ").toLowerCase().includes(q);
    }).slice(0, 80);
  }, [tickets, search]);

  return (
    <div className="ticket-shell">
      {/* Lista de tickets */}
      <div className="ticket-list-wrap">
        <div className="ticket-list-head">
          <span>Tickets resueltos · {filtered.length}</span>
        </div>
        <div style={{ padding: 10 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, título, módulo..." style={{ width: "100%", fontSize: 12.5 }} />
        </div>
        <div className="ticket-list">
          {loadingList && tickets.length === 0 && (
            <div className="ticket-list-skeleton">
              {[1, 2, 3].map((i) => <div key={i} className="ticket-skel" />)}
            </div>
          )}
          {!loadingList && filtered.length === 0 && (
            <div className="ticket-empty">
              <div style={{ fontSize: 36, marginBottom: 6 }}>🪄</div>
              <div style={{ fontSize: 12.5 }}>No hay tickets resueltos para convertir todavía.</div>
            </div>
          )}
          {filtered.map((t) => {
            const active = t.id === selectedId;
            return (
              <button key={t.id} onClick={() => regenerate(t.id)}
                className={`ticket-row ${active ? "active" : ""}`}
                style={{ ["--prio-color" as never]: t.has_kb ? "#10b981" : "#a855f7" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--text-dim)" }}>{t.code}</span>
                    {t.has_kb && (
                      <span className="kanban-tag" style={{ borderColor: "rgba(16,185,129,0.4)", color: "#42be65", background: "rgba(16,185,129,0.08)", fontSize: 9.5 }}>
                        ✓ ya en KB
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>
                      {t.resolved_at && new Date(t.resolved_at).toLocaleDateString().slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    {t.summary || "(sin resumen)"}
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    {t.sap_module && (
                      <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)", fontSize: 9.5 }}>{t.sap_module}</span>
                    )}
                    <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#c084fc", background: "rgba(168,85,247,0.08)", fontSize: 9.5 }}>{t.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor del draft */}
      <div className="ticket-detail">
        {!selectedId ? (
          <div className="ticket-empty">
            <div style={{ fontSize: 44, marginBottom: 8 }}>🪄</div>
            <div style={{ fontSize: 13.5, color: "var(--text-soft)", textAlign: "center", maxWidth: 380 }}>
              Seleccioná un ticket resuelto y Gemini propondrá un draft de KB article a partir de su conversación.
              Vos lo editás y aprobás antes de publicarlo.
            </div>
          </div>
        ) : draftLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-soft)" }}>
            <span className="spinner" /> generando draft con Gemini…
          </div>
        ) : error && !draftResult ? (
          <div className="alert error">{error}</div>
        ) : draftResult && editing ? (
          <div className="col" style={{ gap: 14 }}>
            <div className="ticket-detail-head">
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{draftResult.ticket.code} · draft KB</h2>
                <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                  {draftResult.model} · {draftResult.latencyMs}ms · {draftResult.tokens.total} tok · {draftResult.conversationMessages} msgs
                </div>
              </div>
              <button className="btn ghost" onClick={() => regenerate(draftResult.ticket.id)} disabled={draftLoading}>
                ↻ regenerar
              </button>
            </div>

            {committed && (
              <div className="alert ok">
                ✓ Artículo guardado: <b>{committed.title}</b>.
                <Link href="/support-desk/kb" style={{ marginLeft: 6 }}>Ver en KB →</Link>
              </div>
            )}
            {error && <div className="alert error">{error}</div>}

            <div className="lab-fb-block">
              <div className="lab-fb-block-head">▸ TÍTULO</div>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                style={{ width: "100%", fontSize: 13.5 }} maxLength={200} />
            </div>

            <div className="lab-fb-block">
              <div className="lab-fb-block-head">▸ PROBLEMA</div>
              <textarea value={editing.problem} onChange={(e) => setEditing({ ...editing, problem: e.target.value })}
                style={{ width: "100%", minHeight: 80, fontSize: 12.5, resize: "vertical" }} />
            </div>

            <div className="lab-fb-block">
              <div className="lab-fb-block-head">▸ SOLUCIÓN · markdown</div>
              <textarea value={editing.solution} onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
                style={{ width: "100%", minHeight: 200, fontSize: 12.5, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--text-dim)" }}>preview ↓</summary>
                <div style={{ marginTop: 6, padding: 8, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 6 }}>
                  <MarkdownView text={editing.solution} />
                </div>
              </details>
            </div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div className="lab-fb-block" style={{ flex: 1, minWidth: 200 }}>
                <div className="lab-fb-block-head">▸ MÓDULO SAP</div>
                <input value={editing.system ?? ""} onChange={(e) => setEditing({ ...editing, system: e.target.value || null })}
                  style={{ width: "100%", fontSize: 12.5 }} placeholder="SD, MM, PP..." />
              </div>
              <div className="lab-fb-block" style={{ flex: 1, minWidth: 200 }}>
                <div className="lab-fb-block-head">▸ CATEGORÍA</div>
                <input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value || null })}
                  style={{ width: "100%", fontSize: 12.5 }} placeholder="operativo, configuración..." />
              </div>
            </div>

            <div className="lab-fb-block">
              <div className="lab-fb-block-head">▸ TAGS · {editing.tags.length}/8</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {editing.tags.map((t) => (
                  <span key={t} className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#67e8f9", background: "rgba(69,137,255,0.08)", cursor: "pointer" }}
                    onClick={() => removeTag(t)} title="click para eliminar">
                    {t} ×
                  </span>
                ))}
              </div>
              <div className="row" style={{ gap: 6 }}>
                <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="agregar tag y Enter..." style={{ flex: 1, fontSize: 12.5 }} maxLength={32} />
                <button className="btn ghost" onClick={addTag} disabled={!tagDraft.trim()} style={{ padding: "4px 12px" }}>+ tag</button>
              </div>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn primary" onClick={save} disabled={committing || !editing.title.trim() || !editing.solution.trim()}
                style={{ minWidth: 180 }}>
                {committing ? <><span className="spinner" /> guardando…</> : "✓ Guardar en KB"}
              </button>
              <button className="btn ghost" onClick={() => regenerate(draftResult.ticket.id)} disabled={draftLoading}>
                ↻ regenerar draft
              </button>
              <Link href={`/support-desk/tickets`} className="btn ghost" style={{ marginLeft: "auto" }}>ver ticket origen →</Link>
            </div>

            <div className="lab-fb-block" style={{ opacity: 0.7 }}>
              <div className="lab-fb-block-head">▸ JUSTIFICACIÓN GEMINI</div>
              <div style={{ fontSize: 11.5, color: "var(--text-soft)", fontStyle: "italic" }}>
                "{draftResult.draft.sourceSummary}"
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// PLAYGROUND TAB · 2 slots de system prompt vs misma query
// ============================================================================
const DEFAULT_SYSTEM_A = `Eres un experto de Mesa de Soporte AMS Supply Chain SAP.
Respondés en español, máximo 6 líneas, con pasos concretos.
Mencionás transacción/programa SAP cuando aplique.`;

const DEFAULT_SYSTEM_B = `You are an AMS Supply Chain SAP support specialist.
Reply in Spanish with a numbered list of steps.
For each step include the SAP transaction code in **bold**.
End with a one-line confidence assessment.`;

const SAMPLE_QUERIES = [
  "El usuario no puede crear una nota de pedido. La VA01 da error 'precio cero no permitido'.",
  "MIGO no actualiza stock después del traslado entre almacenes. ¿Qué reviso primero?",
  "Job de fact electrónica colgado en SM37 con status 'liberado' hace 2 horas. Pasos.",
];

interface Slot {
  id: "a" | "b";
  label: string;
  systemPrompt: string;
  temperature: number;
  loading: boolean;
  result: PlaygroundRunResult | null;
  error: string | null;
}

function PlaygroundTab() {
  const [queryText, setQueryText] = useState("");
  const [slots, setSlots] = useState<Slot[]>([
    { id: "a", label: "Variante A · ES corta", systemPrompt: DEFAULT_SYSTEM_A, temperature: 0.4, loading: false, result: null, error: null },
    { id: "b", label: "Variante B · ES estructurada", systemPrompt: DEFAULT_SYSTEM_B, temperature: 0.4, loading: false, result: null, error: null },
  ]);
  const [activePrompt, setActivePrompt] = useState<PromptVersion | null>(null);
  const [adoptingSlot, setAdoptingSlot] = useState<"a" | "b" | null>(null);
  const [adoptNotice, setAdoptNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePrompt().then((r) => { if (r.ok) setActivePrompt(r.version); });
  }, []);

  function patchSlot(id: "a" | "b", patch: Partial<Slot>) {
    setSlots((ss) => ss.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  async function adoptSlot(id: "a" | "b") {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    const notes = window.prompt(
      "Notas de adopción (opcional). Quedan en el historial de versiones.",
      `Adoptado desde Playground el ${new Date().toLocaleString("es-CL")}`
    );
    if (notes === null) return;
    setAdoptingSlot(id);
    const r = await adoptPlaygroundPrompt({
      label: slot.label,
      systemPrompt: slot.systemPrompt,
      temperature: slot.temperature,
      maxTokens: 1024,
      adoptionNotes: notes,
    });
    setAdoptingSlot(null);
    if (r.ok) {
      setActivePrompt(r.version);
      setAdoptNotice(`✓ Adoptado: "${slot.label}". Ahora es el prompt activo del agente.`);
      setTimeout(() => setAdoptNotice(null), 4000);
    } else {
      setAdoptNotice(`⚠ ${r.error}`);
      setTimeout(() => setAdoptNotice(null), 4500);
    }
  }

  async function runOne(id: "a" | "b") {
    const slot = slots.find((s) => s.id === id);
    if (!slot || !queryText.trim()) return;
    patchSlot(id, { loading: true, error: null, result: null });
    const r = await runPlaygroundQuery({
      systemPrompt: slot.systemPrompt,
      query: queryText,
      temperature: slot.temperature,
      maxOutputTokens: 1024,
    });
    if (r.ok) patchSlot(id, { loading: false, result: r.result });
    else patchSlot(id, { loading: false, error: r.error });
  }

  async function runBoth() {
    if (!queryText.trim()) return;
    await Promise.all([runOne("a"), runOne("b")]);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Banner del prompt activo */}
      <div className="card" style={{ borderLeft: "3px solid #10b981" }}>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, letterSpacing: 1.5, color: "#10b981", fontFamily: "var(--font-mono, monospace)" }}>
            ▸ PROMPT ACTIVO EN PRODUCCIÓN
          </span>
          {activePrompt ? (
            <>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{activePrompt.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                · temp {activePrompt.temperature.toFixed(2)} · {activePrompt.max_tokens} tok ·
                adoptado {new Date(activePrompt.created_at).toLocaleString("es-CL")} por <b>{activePrompt.created_by}</b>
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>
              ninguna versión adoptada todavía — el agente sigue usando su prompt por default
            </span>
          )}
        </div>
        {adoptNotice && (
          <div className={adoptNotice.startsWith("✓") ? "alert ok" : "alert error"} style={{ marginTop: 8, fontSize: 12 }}>
            {adoptNotice}
          </div>
        )}
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🎛</span> QUERY DEL USUARIO
        </div>
        <textarea value={queryText} onChange={(e) => setQueryText(e.target.value)}
          placeholder="Escribí la pregunta del cliente o un mensaje real para probar..."
          style={{ width: "100%", minHeight: 70, fontSize: 13, resize: "vertical" }} />
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>SAMPLES:</span>
          {SAMPLE_QUERIES.map((q, i) => (
            <button key={i} onClick={() => setQueryText(q)} className="btn ghost" style={{ fontSize: 10.5, padding: "3px 8px" }}>
              {q.slice(0, 50)}…
            </button>
          ))}
          <button className="btn primary" onClick={runBoth} disabled={!queryText.trim() || slots.some((s) => s.loading)}
            style={{ marginLeft: "auto", minWidth: 160 }}>
            {slots.some((s) => s.loading) ? <><span className="spinner" /> ejecutando…</> : "⚡ Ejecutar ambas"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {slots.map((slot) => (
          <PlaygroundSlot key={slot.id} slot={slot}
            onChangeSystem={(v) => patchSlot(slot.id, { systemPrompt: v })}
            onChangeTemp={(v) => patchSlot(slot.id, { temperature: v })}
            onRun={() => runOne(slot.id)}
            onAdopt={() => adoptSlot(slot.id)}
            adopting={adoptingSlot === slot.id}
            disabled={!queryText.trim()}
          />
        ))}
      </div>
    </div>
  );
}

function PlaygroundSlot({
  slot, onChangeSystem, onChangeTemp, onRun, onAdopt, adopting, disabled,
}: {
  slot: Slot;
  onChangeSystem: (v: string) => void;
  onChangeTemp: (v: number) => void;
  onRun: () => void;
  onAdopt: () => void;
  adopting: boolean;
  disabled: boolean;
}) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${slot.id === "a" ? "#4589ff" : "#a855f7"}` }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: slot.id === "a" ? "#4589ff" : "#c084fc" }}>
          {slot.label}
        </div>
        <div className="row" style={{ gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>temp</span>
          <input type="range" min={0} max={1.5} step={0.1} value={slot.temperature}
            onChange={(e) => onChangeTemp(Number(e.target.value))}
            style={{ width: 80 }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", minWidth: 26 }}>
            {slot.temperature.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="lab-fb-block">
        <div className="lab-fb-block-head">▸ SYSTEM PROMPT</div>
        <textarea value={slot.systemPrompt} onChange={(e) => onChangeSystem(e.target.value)}
          style={{ width: "100%", minHeight: 110, fontSize: 11.5, fontFamily: "var(--font-mono, monospace)", resize: "vertical" }} />
      </div>

      <button className="btn primary" onClick={onRun} disabled={disabled || slot.loading}
        style={{ marginTop: 8, width: "100%" }}>
        {slot.loading ? <><span className="spinner" /> esperando Gemini…</> : `▶ correr ${slot.label.split("·")[0].trim()}`}
      </button>

      {slot.error && <div className="alert error" style={{ marginTop: 8, fontSize: 12 }}>{slot.error}</div>}

      {slot.result && (
        <div className="col" style={{ gap: 8, marginTop: 10 }}>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
            <span>⏱ {slot.result.latencyMs} ms</span>
            <span>·</span>
            <span>📥 {slot.result.tokens.prompt} prompt</span>
            <span>·</span>
            <span>📤 {slot.result.tokens.completion} completion</span>
            <span>·</span>
            <span>Σ {slot.result.tokens.total} tot</span>
          </div>
          <div className="lab-fb-block" style={{ background: "rgba(15, 23, 42, 0.55)" }}>
            <div className="lab-fb-block-head">▸ RESPUESTA</div>
            <div style={{ maxHeight: 360, overflowY: "auto", fontSize: 12.5 }}>
              <MarkdownView text={slot.result.text} />
            </div>
          </div>

          <button className="btn primary" onClick={onAdopt} disabled={adopting}
            style={{ width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", borderColor: "#10b981" }}>
            {adopting
              ? <><span className="spinner" /> adoptando…</>
              : "✓ Adoptar como prompt activo del agente"}
          </button>
        </div>
      )}
    </div>
  );
}


export default function AgentLabPage() {
  return (
    <RequirePermission screen="agente_ams" action="view">
      <AgentLabPageInner />
    </RequirePermission>
  );
}
