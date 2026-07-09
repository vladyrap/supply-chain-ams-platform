"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import MarkdownView from "@/components/agent/MarkdownView";
import FeedbackButtons from "@/components/agent-lab/FeedbackButtons";
import { supportApi, type SupportConversation, type SupportMessage, type SupportStatus, type SupportChannel } from "@/services/support.api";

const STATUS_META: Record<SupportStatus, { color: string; label: string; icon: string }> = {
  open:            { color: "#4589ff", label: "Abierta",          icon: "○" },
  ai_handling:     { color: "#3b82f6", label: "IA atendiendo",    icon: "🤖" },
  waiting_user:    { color: "#8a6d00", label: "Esperando usuario", icon: "⏳" },
  escalated:       { color: "#b45309", label: "Escalada N2",      icon: "📤" },
  resolved:        { color: "#10b981", label: "Resuelta IA",      icon: "✓" },
  closed:          { color: "#6b7280", label: "Cerrada",          icon: "📦" },
};

const CHANNEL_META: Record<SupportChannel, { color: string; icon: string; label: string }> = {
  chat:     { color: "#4589ff", icon: "💬", label: "Chat web" },
  whatsapp: { color: "#10b981", icon: "📱", label: "WhatsApp" },
  voice:    { color: "#a855f7", icon: "📞", label: "Voz" },
  email:    { color: "#8a6d00", icon: "✉",  label: "Email" },
};

const URGENCY_META: Record<string, { color: string; icon: string }> = {
  baja:    { color: "#10b981", icon: "○" },
  media:   { color: "#4589ff", icon: "●" },
  alta:    { color: "#b45309", icon: "▲" },
  critica: { color: "#fa4d56", icon: "🔥" },
};

const STATUS_ORDER: (SupportStatus | "all")[] = ["all", "open", "ai_handling", "waiting_user", "escalated", "resolved", "closed"];

function avatarInitial(s: string | null | undefined): string {
  if (!s) return "?";
  return s.trim().charAt(0).toUpperCase();
}
function avatarColor(s: string | null | undefined): string {
  if (!s) return "#64748b";
  const hash = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ["#4589ff", "#a855f7", "#10b981", "#f1c21b", "#3b82f6", "#f43f5e", "#06b6d4"];
  return colors[hash % colors.length];
}
function fmtRel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.round(d / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

export default function ConversationsPage() {
  const [list, setList] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<SupportChannel | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ conv: SupportConversation; messages: SupportMessage[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.listConversations();
    if ("success" in r && r.success) setList(r.conversations);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    supportApi.getConversation(selectedId).then((r) => {
      if (cancelled) return;
      if ("success" in r && r.success) setDetail({ conv: r.conversation, messages: r.messages });
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Scroll al final cuando se carga el detalle
  useEffect(() => {
    if (detail && messagesEndRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [detail]);

  // Stats
  const stats = useMemo(() => {
    const total = list.length;
    const open = list.filter((c) => ["open", "ai_handling", "waiting_user"].includes(c.status)).length;
    const escalated = list.filter((c) => c.status === "escalated").length;
    const resolved = list.filter((c) => c.status === "resolved" || c.status === "closed").length;
    const aiRate = total > 0 ? Math.round((list.filter((c) => c.ai_resolved).length / total) * 100) : 0;
    const totalMessages = list.reduce((a, b) => a + (b.message_count ?? 0), 0);
    const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0;
    const countsByStatus: Record<SupportStatus | "all", number> = {
      all: total, open: 0, ai_handling: 0, waiting_user: 0, escalated: 0, resolved: 0, closed: 0,
    };
    list.forEach((c) => { countsByStatus[c.status]++; });
    return { total, open, escalated, resolved, aiRate, avgMessages, countsByStatus };
  }, [list]);

  // Filtros client-side
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (q) {
        const hay = [c.user_name, c.user_email, c.user_phone, c.summary, c.sap_module, c.category].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, statusFilter, channelFilter, search]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>SUPPORT · CONVERSATIONS</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>📋 Conversaciones</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Timeline de las atenciones de la mesa con triage IA y escalaciones a Nivel 2.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{stats.total}</div>
              <div className="kanban-stat-lbl">TOTAL</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#f1c21b" }}>
              <div className="kanban-stat-val">{stats.open}</div>
              <div className="kanban-stat-lbl">ABIERTAS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#f59e0b" }}>
              <div className="kanban-stat-val">{stats.escalated}</div>
              <div className="kanban-stat-lbl">ESCALADAS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats.aiRate}%</div>
              <div className="kanban-stat-lbl">RESUELTAS IA</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          {STATUS_ORDER.map((s) => {
            const meta = s === "all" ? null : STATUS_META[s];
            const count = stats.countsByStatus[s];
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`ticket-filter ${statusFilter === s ? "active" : ""}`}
                style={{ ["--filt-color" as never]: meta?.color ?? "#4589ff" }}>
                {meta ? `${meta.icon} ${meta.label}` : "▸ Todas"} <span className="ticket-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10, alignItems: "center", position: "relative", zIndex: 2 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, email, teléfono, módulo SAP o resumen..."
            style={{ flex: 1, fontSize: 12.5 }} />
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as never)} style={{ minWidth: 140 }}>
            <option value="all">Todos los canales</option>
            <option value="chat">💬 Chat web</option>
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="voice">📞 Voz</option>
            <option value="email">✉ Email</option>
          </select>
          <Link href="/support-desk/simulator" className="btn ghost" style={{ padding: "5px 12px", fontSize: 12 }}>💬 Simulador</Link>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ padding: "5px 12px", fontSize: 12 }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻"}
          </button>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="ticket-shell">
        {/* LISTA */}
        <div className="ticket-list-wrap">
          <div className="ticket-list-head">
            <span>{filtered.length} conversaci{filtered.length === 1 ? "ón" : "ones"}</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5 }}>orden: más recientes primero</span>
          </div>

          {loading && list.length === 0 && (
            <div className="ticket-list-skeleton">
              {[1, 2, 3, 4].map((i) => <div key={i} className="ticket-skel" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="ticket-empty">
              <div style={{ fontSize: 36, marginBottom: 6 }}>💬</div>
              <div style={{ fontSize: 13.5 }}>
                {list.length === 0
                  ? "Aún no hay conversaciones. Crea una desde el simulador."
                  : "Ningún resultado para los filtros actuales."}
              </div>
            </div>
          )}

          <div className="ticket-list">
            {filtered.map((c) => {
              const status = STATUS_META[c.status];
              const channel = CHANNEL_META[c.channel];
              const urgency = c.urgency ? URGENCY_META[c.urgency] : null;
              const active = c.id === selectedId;
              const name = c.user_name || c.user_email || c.user_phone || "(anónimo)";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`ticket-row conv-row ${active ? "active" : ""}`}
                  style={{ ["--prio-color" as never]: channel.color, ["--status-color" as never]: status.color }}
                >
                  <span className="ticket-avatar" style={{ background: avatarColor(name), color: "white" }}>
                    {avatarInitial(name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                      <span className="conv-channel" style={{ color: channel.color }} title={channel.label}>
                        {channel.icon}
                      </span>
                      <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55`, marginLeft: "auto" }}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {c.summary ?? <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>(sin resumen aún)</span>}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {c.sap_module && c.sap_module !== "NO_INFORMADO" && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(69,137,255,0.4)", color: "#0284c7", background: "rgba(69,137,255,0.08)" }}>{c.sap_module}</span>
                      )}
                      {urgency && (
                        <span className="kanban-tag" style={{ borderColor: `${urgency.color}55`, color: urgency.color, background: `${urgency.color}11` }}>
                          {urgency.icon} {c.urgency}
                        </span>
                      )}
                      <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                        💬 {c.message_count ?? 0}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>
                        {fmtRel(c.updated_at)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETALLE */}
        <div className="ticket-detail">
          {!selectedId ? (
            <div className="ticket-empty">
              <div style={{ fontSize: 44, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13.5, color: "var(--text-soft)", textAlign: "center" }}>
                Seleccioná una conversación para ver la transcripción completa con triage IA y mensajes.
              </div>
            </div>
          ) : detailLoading && !detail ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-soft)" }}>
              <span className="spinner" /> cargando conversación…
            </div>
          ) : detail ? (
            <ConversationDetail detail={detail} messagesEndRef={messagesEndRef} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL
// ============================================================================
function ConversationDetail({ detail, messagesEndRef }: { detail: { conv: SupportConversation; messages: SupportMessage[] }; messagesEndRef: React.MutableRefObject<HTMLDivElement | null> }) {
  const { conv, messages } = detail;
  const status = STATUS_META[conv.status];
  const channel = CHANNEL_META[conv.channel];
  const urgency = conv.urgency ? URGENCY_META[conv.urgency] : null;
  const name = conv.user_name || conv.user_email || conv.user_phone || "(anónimo)";
  const duration = conv.closed_at
    ? new Date(conv.closed_at).getTime() - new Date(conv.created_at).getTime()
    : Date.now() - new Date(conv.created_at).getTime();
  const durationMin = Math.round(duration / 60000);

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Header */}
      <div className="ticket-detail-head">
        <span className="ticket-avatar" style={{ background: avatarColor(name), color: "white", width: 42, height: 42, fontSize: 17 }}>
          {avatarInitial(name)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 0.3 }}>{name}</h2>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
            {conv.user_email || conv.user_phone || conv.id.slice(0, 8)}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span className="kanban-tag" style={{ borderColor: `${channel.color}55`, color: channel.color, background: `${channel.color}11` }}>
              {channel.icon} {channel.label}
            </span>
            <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55` }}>
              {status.icon} {status.label}
            </span>
            {urgency && (
              <span className="kanban-tag" style={{ borderColor: `${urgency.color}55`, color: urgency.color, background: `${urgency.color}11` }}>
                {urgency.icon} {conv.urgency}
              </span>
            )}
          </div>
        </div>
        {conv.escalated_to_ticket && (
          <Link href="/support-desk/tickets" className="btn primary" style={{ fontSize: 11, padding: "4px 10px", whiteSpace: "nowrap" }}>
            📤 ver ticket N2 →
          </Link>
        )}
      </div>

      {/* Triage IA */}
      <div className="conv-triage">
        <div className="ticket-section-head" style={{ marginBottom: 0 }}>
          <span style={{ color: "var(--accent)" }}>🧠</span> TRIAGE · CLASIFICACIÓN IA
        </div>
        <div className="conv-triage-grid">
          <div>
            <div className="conv-triage-label">MÓDULO SAP</div>
            <div className="conv-triage-value">{conv.sap_module || "—"}</div>
          </div>
          <div>
            <div className="conv-triage-label">CATEGORÍA</div>
            <div className="conv-triage-value">{conv.category || "—"}</div>
          </div>
          <div>
            <div className="conv-triage-label">INTENT</div>
            <div className="conv-triage-value">{conv.intent || "—"}</div>
          </div>
          <div>
            <div className="conv-triage-label">CLIENTE</div>
            <div className="conv-triage-value">{conv.client || "—"}</div>
          </div>
          <div>
            <div className="conv-triage-label">MENSAJES</div>
            <div className="conv-triage-value" style={{ color: "var(--accent)" }}>{conv.message_count ?? messages.length}</div>
          </div>
          <div>
            <div className="conv-triage-label">DURACIÓN</div>
            <div className="conv-triage-value" style={{ color: "var(--accent)" }}>
              {durationMin < 60 ? `${durationMin}m` : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`}
            </div>
          </div>
        </div>
      </div>

      {conv.summary && (
        <div className="ticket-section">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>▸</span> RESUMEN GENERADO POR IA
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{conv.summary}</div>
        </div>
      )}

      {/* Mensajes */}
      <div className="conv-messages">
        <div className="ticket-section-head" style={{ marginBottom: 10 }}>
          <span style={{ color: "var(--accent)" }}>💬</span> TRANSCRIPCIÓN · {messages.length} mensajes
        </div>
        <div className="conv-thread">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();

            if (m.role === "system") {
              return (
                <div key={m.id}>
                  {showDate && <DateDivider date={m.created_at} />}
                  <div className="conv-msg-system">
                    <span style={{ marginRight: 6, color: "#8a6d00" }}>⚙</span>
                    {m.text}
                  </div>
                </div>
              );
            }
            const isUser = m.role === "user";
            // last user message before this AI msg (para enviarlo como query del feedback)
            let lastUserQuery: string | undefined;
            if (!isUser) {
              for (let k = i - 1; k >= 0; k--) {
                if (messages[k].role === "user") {
                  lastUserQuery = messages[k].text ?? undefined;
                  break;
                }
              }
            }
            return (
              <div key={m.id}>
                {showDate && <DateDivider date={m.created_at} />}
                <div className={`conv-msg ${isUser ? "user" : "ai"}`}>
                  {!isUser && (
                    <span className="conv-msg-avatar" style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}>🤖</span>
                  )}
                  <div className="conv-msg-content">
                    <div className="conv-msg-meta">
                      {isUser ? "Cliente" : "AMS-Bot"} · {new Date(m.created_at).toLocaleTimeString().slice(0, 5)}
                    </div>
                    <div className={`conv-msg-bubble ${isUser ? "user" : "ai"}`}>
                      {isUser ? <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span> : <MarkdownView text={m.text ?? ""} />}
                    </div>
                    {!isUser && m.text && m.text.length > 0 && (
                      <div style={{ marginTop: 4, marginLeft: 2 }}>
                        <FeedbackButtons
                          source="support"
                          compact
                          conversationId={conv.id}
                          messageId={m.id}
                          query={lastUserQuery}
                          response={m.text}
                        />
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <span className="conv-msg-avatar" style={{ background: avatarColor(name), color: "white" }}>
                      {avatarInitial(name)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

function DateDivider({ date }: { date: string }) {
  const today = new Date();
  const d = new Date(date);
  let label = d.toLocaleDateString("es-CL");
  if (d.toDateString() === today.toDateString()) label = "Hoy";
  else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) label = "Ayer";
  }
  return (
    <div className="conv-date-divider">
      <span className="conv-date-line" />
      <span className="conv-date-label">{label}</span>
      <span className="conv-date-line" />
    </div>
  );
}
