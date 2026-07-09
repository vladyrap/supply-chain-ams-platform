"use client";

// =============================================================================
// /agent-chat/[id] — v1.3 Agent Hub (F6: conversaciones persistentes)
// =============================================================================
// - Sidebar izquierda: conversaciones previas del user con este agente
// - El primer mensaje crea la conversación en backend; los siguientes la
//   continúan (multi-turn con historial en el prompt)
// - Rating inline + metadata por respuesta
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { useAuth } from "@/context/AuthContext";
import {
  getAgent, chatWithAgent, rateAgent,
  listConversations, getConversation, deleteConversation,
  type CustomAgent, type AgentConversation,
} from "@/services/custom-agents.api";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  at: string;
  meta?: { model?: string; confidence?: string; ragCount?: number };
}

export default function AgentChatPage() {
  const params = useParams<{ id: string }>();
  const agentId = params?.id ?? "";
  const { user } = useAuth();
  const userId = user?.email ?? user?.name ?? "anonymous";

  const [agent, setAgent] = useState<CustomAgent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadAgent = useCallback(async () => {
    if (!agentId) return;
    const r = await getAgent(agentId);
    if (r.success) setAgent(r.agent);
    else setLoadError(r.error);
  }, [agentId]);

  const loadConversations = useCallback(async () => {
    if (!agentId) return;
    const r = await listConversations(agentId, userId);
    if (r.success) setConversations(r.conversations);
  }, [agentId, userId]);

  useEffect(() => { loadAgent(); }, [loadAgent]);
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function openConversation(convId: string) {
    const r = await getConversation(convId);
    if (!r.success) return;
    setActiveConvId(convId);
    setMessages(r.messages.map((m) => ({
      role: m.role,
      text: m.content,
      at: m.createdAt,
      meta: m.role === "agent" ? {
        model: m.metadata?.model as string | undefined,
        confidence: m.metadata?.confidence as string | undefined,
        ragCount: m.metadata?.ragCount as number | undefined,
      } : undefined,
    })));
  }

  function newConversation() {
    setActiveConvId(null);
    setMessages([]);
  }

  async function handleDeleteConv(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar esta conversación?")) return;
    await deleteConversation(convId, userId);
    if (activeConvId === convId) newConversation();
    loadConversations();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy || !agent) return;
    setInput("");
    setMessages((cur) => [...cur, { role: "user", text, at: new Date().toISOString() }]);
    setBusy(true);
    const r = await chatWithAgent(agent.id, {
      message: text,
      user: userId,
      conversationId: activeConvId ?? undefined,
    });
    setBusy(false);
    if (r.success) {
      if (!activeConvId) {
        setActiveConvId(r.conversationId);
        loadConversations(); // refrescar sidebar con la conversación nueva
      }
      setMessages((cur) => [...cur, {
        role: "agent",
        text: r.response,
        at: new Date().toISOString(),
        meta: {
          model: r.metadata.model,
          confidence: r.metadata.confidence,
          ragCount: r.metadata.ragSources?.length ?? 0,
        },
      }]);
    } else {
      setMessages((cur) => [...cur, {
        role: "agent",
        text: `⚠ No pude procesar tu mensaje: ${r.error}`,
        at: new Date().toISOString(),
      }]);
    }
  }

  async function handleRate(stars: number) {
    if (!agent || rated) return;
    const r = await rateAgent(agent.id, stars);
    if (r.success) {
      setAgent(r.agent);
      setRated(true);
    }
  }

  if (loadError) {
    return (
      <div className="card" style={{ padding: 30, textAlign: "center" }}>
        <div style={{ color: "#da1e28", marginBottom: 12 }}>{loadError}</div>
        <Link href="/agent-hub?tab=library" className="btn ghost">← Volver a la biblioteca</Link>
      </div>
    );
  }
  if (!agent) {
    return <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>Cargando agente…</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 12, height: "calc(100vh - 120px)" }}>
      {/* Sidebar conversaciones */}
      <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        <button className="btn primary" onClick={newConversation} style={{ width: "100%", fontSize: 13 }}>
          ＋ Nueva conversación
        </button>
        <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: "var(--text-dim)", textTransform: "uppercase", marginTop: 6 }}>
          Historial ({conversations.length})
        </div>
        {conversations.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "8px 4px" }}>
            Sin conversaciones aún.
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => openConversation(c.id)}
            style={{
              padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5,
              background: activeConvId === c.id ? "rgba(69,137,255,0.12)" : "transparent",
              border: `1px solid ${activeConvId === c.id ? "rgba(69,137,255,0.35)" : "var(--border-soft)"}`,
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>
                {c.messageCount} msg · {new Date(c.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={(e) => handleDeleteConv(c.id, e)}
              title="Eliminar"
              style={{ background: "none", border: 0, cursor: "pointer", color: "var(--text-dim)", fontSize: 12, flexShrink: 0 }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Columna principal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        {/* Header del agente */}
        <div className="card" style={{ padding: "14px 18px" }}>
          <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center", minWidth: 0 }}>
              <Link href="/agent-hub?tab=library" className="btn ghost" style={{ padding: "4px 10px", fontSize: 13 }}>←</Link>
              <span style={{
                fontSize: 24, width: 44, height: 44, display: "grid", placeItems: "center",
                borderRadius: 10, background: "rgba(69,137,255,0.1)", border: "1px solid rgba(69,137,255,0.2)",
              }}>
                {agent.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{agent.name}</div>
                <div className="row" style={{ gap: 6, marginTop: 3 }}>
                  <Badge variant="muted">{agent.category}</Badge>
                  {agent.isVerified && <Badge variant="ok">✓ Verificado</Badge>}
                  <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                    ⭐ {agent.ratingCount > 0 ? agent.rating.toFixed(1) : "—"} · 💬 {agent.chatCount}
                  </span>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 2, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginRight: 6 }}>
                {rated ? "¡Gracias!" : "Calificar:"}
              </span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => handleRate(s)} disabled={rated}
                  style={{
                    background: "none", border: 0, fontSize: 16,
                    cursor: rated ? "default" : "pointer",
                    opacity: rated ? 0.35 : 0.8,
                  }}
                  title={`${s} estrella${s > 1 ? "s" : ""}`}>
                  ⭐
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="card" style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, marginTop: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{agent.icon}</div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{agent.name}</div>
              <div style={{ maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                {agent.description || "Escribí tu consulta abajo para empezar."}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
            }}>
              <div style={{
                padding: "10px 14px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.55,
                background: m.role === "user"
                  ? "linear-gradient(135deg, rgba(69,137,255,0.18), rgba(190,149,255,0.18))"
                  : "rgba(15,23,42,0.6)",
                border: `1px solid ${m.role === "user" ? "rgba(69,137,255,0.3)" : "var(--border-soft)"}`,
              }}>
                {m.role === "agent" ? <MarkdownView text={m.text} /> : m.text}
              </div>
              {m.meta && (
                <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4, paddingLeft: 4 }}>
                  {m.meta.model} · confianza {m.meta.confidence}
                  {m.meta.ragCount ? ` · ${m.meta.ragCount} fuente${m.meta.ragCount > 1 ? "s" : ""} KB` : ""}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 12, background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-soft)", fontSize: 13, color: "var(--text-dim)" }}>
              <span className="spinner" style={{ marginRight: 8 }} />{agent.name} está pensando…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="row" style={{ gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Preguntale a ${agent.name}…`}
            disabled={busy}
            style={{ flex: 1, padding: "12px 16px", fontSize: 14 }}
            autoFocus
          />
          <button type="submit" className="btn primary" disabled={busy || !input.trim()} style={{ padding: "12px 22px" }}>
            {busy ? "…" : "Enviar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
