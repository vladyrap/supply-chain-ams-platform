"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import FeedbackButtons from "@/components/agent-lab/FeedbackButtons";
import { useToast } from "@/context/ToastContext";
import { supportApi, type SupportConversation, type SupportMessage, type SupportChannel } from "@/services/support.api";

const CHANNELS: { id: SupportChannel; label: string; icon: string; hint: string }[] = [
  { id: "chat",     label: "Chat web",  icon: "💬", hint: "Cliente abre la app y escribe." },
  { id: "whatsapp", label: "WhatsApp",  icon: "📱", hint: "Simulación de mensajes WhatsApp (Twilio cuando enchufes credenciales)." },
  { id: "voice",    label: "Llamada",   icon: "☎️", hint: "Simulación de llamada con STT del browser (Whisper cuando enchufes Twilio)." },
  { id: "email",    label: "Email",     icon: "✉️", hint: "Simulación de hilo de email." },
];

function uid() { return Math.random().toString(36).slice(2); }

interface PendingMsg {
  id: string;
  role: "user" | "ai" | "system";
  text: string;
  pending?: boolean;
}

export default function SimulatorPage() {
  const toast = useToast();
  const [channel, setChannel] = useState<SupportChannel>("whatsapp");
  const [userName, setUserName] = useState("Cliente Demo");
  const [userPhone, setUserPhone] = useState("+56 9 1234 5678");
  const [client, setClient] = useState("demo");
  const [conv, setConv] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<PendingMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triageInfo, setTriageInfo] = useState<{ urgency: string; sap_module: string; category: string; confidence: string } | null>(null);
  const [escalatedCode, setEscalatedCode] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function start() {
    setError(null);
    if (!draft.trim()) { setError("Escribe el mensaje del cliente primero."); return; }
    setSending(true);
    const initial = draft.trim();
    setMessages([{ id: uid(), role: "user", text: initial }, { id: uid(), role: "ai", text: "", pending: true }]);
    setDraft("");

    const res = await supportApi.startConversation({
      channel,
      user_name: userName.trim() || undefined,
      user_phone: userPhone.trim() || undefined,
      client: client.trim() || undefined,
      initial_message: initial,
    });
    setSending(false);

    if (!("success" in res) || !res.success) {
      setError("error" in res ? res.error : "Error");
      setMessages((m) => m.filter((x) => !x.pending));
      return;
    }
    setConv(res.conversation);
    if (res.firstResponse) {
      const fr = res.firstResponse;
      setTriageInfo({
        urgency: fr.triage.urgency,
        sap_module: fr.triage.sap_module,
        category: fr.triage.category,
        confidence: fr.triage.confidence,
      });
      // Cargar todo el historial (incluye saludo system, user, ai)
      const detail = await supportApi.getConversation(res.conversation.id);
      if ("success" in detail && detail.success) {
        setMessages(detail.messages.map(toPending));
      }
      if (fr.escalatedTicket) {
        setEscalatedCode(fr.escalatedTicket.code);
        toast.warn(`Escalado a ${fr.escalatedTicket.code} (Nivel 2)`);
      }
    } else if (res.welcome) {
      const detail = await supportApi.getConversation(res.conversation.id);
      if ("success" in detail && detail.success) {
        setMessages(detail.messages.map(toPending));
      }
    }
  }

  async function send() {
    if (!conv || !draft.trim() || sending) return;
    setError(null);
    setSending(true);
    const text = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { id: uid(), role: "user", text }, { id: uid(), role: "ai", text: "", pending: true }]);

    const res = await supportApi.sendMessage(conv.id, text);
    setSending(false);

    if (!("success" in res) || !res.success) {
      setError("error" in res ? res.error : "Error");
      setMessages((m) => m.filter((x) => !x.pending));
      return;
    }
    setConv(res.conversation);
    setTriageInfo({
      urgency: res.triage.urgency,
      sap_module: res.triage.sap_module,
      category: res.triage.category,
      confidence: res.triage.confidence,
    });
    // Re-cargar mensajes para tener los del system (saludo, escalación)
    const detail = await supportApi.getConversation(conv.id);
    if ("success" in detail && detail.success) {
      setMessages(detail.messages.map(toPending));
    }
    if (res.escalatedTicket) {
      setEscalatedCode(res.escalatedTicket.code);
      toast.warn(`Escalado a ${res.escalatedTicket.code} (Nivel 2)`);
    } else if (res.decision.resolved) {
      toast.success("Conversación resuelta por la IA 🎉");
    }
  }

  async function reset() {
    setConv(null);
    setMessages([]);
    setTriageInfo(null);
    setEscalatedCode(null);
    setError(null);
  }

  async function manualEscalate() {
    if (!conv) return;
    if (conv.status === "escalated") { toast.warn("Ya esta escalada"); return; }
    if (conv.status === "resolved" || conv.status === "closed") {
      toast.error(`No se puede escalar una conversacion ${conv.status}`); return;
    }
    const reason = window.prompt(
      "Razon de la escalacion (opcional). Aparecera en el ticket como evidencia.",
      "Cliente solicita atencion humana"
    );
    if (reason === null) return; // canceled
    setSending(true);
    setError(null);
    try {
      const r = await supportApi.escalateConversation(conv.id, reason.trim() || undefined);
      if ("success" in r && r.success) {
        setEscalatedCode(r.ticket.code);
        setConv({ ...conv, status: "escalated", escalated_to_ticket: r.ticket.id });
        // Append mensaje system local (refresca al recargar; aqui solo es visual)
        setMessages((ms) => [...ms, {
          id: uid(), role: "system",
          text: `Caso escalado manualmente a Nivel 2: ${r.ticket.code}.${reason.trim() ? ` Razon: ${reason.trim()}` : ""}`,
        }]);
        toast.warn(`Escalado a ${r.ticket.code} (Nivel 2)`);
      } else {
        const err = "error" in r ? r.error : "No se pudo escalar";
        setError(err);
        toast.error(err);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (conv) send();
      else start();
    }
  }

  const channelDef = CHANNELS.find((c) => c.id === channel)!;

  return (
    <div>
      <div className="page-title">
        <h1>💬 Simulador — Mesa de Soporte</h1>
        <p>Hazte pasar por un cliente y prueba el flujo: la IA tría, busca en KB, intenta resolver y escala si no puede.</p>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--text-soft)" }}>Canal:</span>
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            disabled={!!conv}
            onClick={() => setChannel(c.id)}
            className={`btn ${channel === c.id ? "primary" : "ghost"}`}
            style={{ padding: "4px 12px" }}
            title={c.hint}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* Conversación */}
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "68vh" }}>
          {/* Header tipo WhatsApp */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px",
            background: "linear-gradient(180deg, rgba(91,141,239,0.12), transparent)",
            borderBottom: "1px solid var(--border-soft)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: "linear-gradient(135deg, var(--accent), var(--magenta))",
              display: "grid", placeItems: "center", color: "white", fontWeight: 700,
            }}>{channelDef.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{userName || "Cliente"}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                {channelDef.label} {userPhone && channel === "whatsapp" && `· ${userPhone}`}
              </div>
            </div>
            {conv && <Badge variant={conv.status === "escalated" ? "warn" : conv.status === "resolved" ? "ok" : "info"}>{conv.status}</Badge>}
            {conv && conv.status !== "escalated" && conv.status !== "resolved" && conv.status !== "closed" && (
              <button
                className="btn"
                onClick={manualEscalate}
                disabled={sending}
                title="Crear ticket MESA-NNNN sin esperar a la IA"
                style={{
                  padding: "4px 10px",
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  border: 0,
                }}
              >
                📤 Escalar a N2
              </button>
            )}
            {conv && <button className="btn ghost" onClick={reset} style={{ padding: "4px 10px" }}>nueva</button>}
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                Escribe el primer mensaje del cliente abajo para iniciar la conversación.
              </div>
            )}
            {messages.map((m, i) => {
              // last user message ANTES de este, para enviarlo como "query" si es AI
              let lastUser: string | undefined;
              if (m.role === "ai" && !m.pending) {
                for (let k = i - 1; k >= 0; k--) {
                  if (messages[k].role === "user") { lastUser = messages[k].text; break; }
                }
              }
              return (
                <Bubble
                  key={m.id}
                  msg={m}
                  conversationId={conv?.id}
                  lastUserQuery={lastUser}
                />
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div style={{ padding: 12, borderTop: "1px solid var(--border-soft)" }}>
            {error && <div className="alert error" style={{ fontSize: 12, marginBottom: 8 }}>{error}</div>}
            {!conv && (
              <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nombre cliente" style={{ flex: 1, minWidth: 140 }} />
                {channel === "whatsapp" && <input value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="Teléfono" style={{ flex: 1, minWidth: 140 }} />}
                <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Cliente / cuenta" style={{ width: 140 }} />
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder={conv ? "Responde como cliente…" : "Primer mensaje del cliente (Enter envía)…"}
                style={{ flex: 1, minHeight: 60, resize: "none" }}
                disabled={sending || conv?.status === "escalated" || conv?.status === "resolved" || conv?.status === "closed"}
              />
              <button
                className="btn primary"
                onClick={conv ? send : start}
                disabled={sending || !draft.trim() || conv?.status === "escalated" || conv?.status === "resolved" || conv?.status === "closed"}
                style={{ minWidth: 100 }}
              >
                {sending ? <><span className="spinner" />…</> : (conv ? "Enviar" : "Iniciar")}
              </button>
            </div>
          </div>
        </div>

        {/* Panel lateral con info de triage */}
        <div className="col" style={{ gap: 12 }}>
          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Triage de la IA</h3>
            {!triageInfo ? (
              <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Esperando primer mensaje…
              </div>
            ) : (
              <div className="col" style={{ gap: 8 }}>
                <Row label="Módulo SAP" value={<Badge variant="tech">{triageInfo.sap_module}</Badge>} />
                <Row label="Urgencia" value={
                  <Badge variant={
                    triageInfo.urgency === "critica" ? "error" :
                    triageInfo.urgency === "alta" ? "warn" :
                    triageInfo.urgency === "media" ? "info" : "ok"
                  }>{triageInfo.urgency}</Badge>
                } />
                <Row label="Categoría" value={<Badge variant="muted">{triageInfo.category}</Badge>} />
                <Row label="Confianza IA" value={
                  <Badge variant={
                    triageInfo.confidence === "alta" ? "ok" :
                    triageInfo.confidence === "media" ? "warn" : "error"
                  }>{triageInfo.confidence}</Badge>
                } />
              </div>
            )}
          </div>

          {escalatedCode && (
            <div className="card" style={{ borderColor: "var(--warn)" }}>
              <h3 style={{ marginTop: 0, fontSize: 14, color: "var(--warn)" }}>📤 Caso escalado</h3>
              <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "6px 0 10px" }}>
                Se creó el ticket <b>{escalatedCode}</b> y se asignó al rol N2 sugerido. Revísalo y resuélvelo desde el panel.
              </p>
              <Link href="/support-desk/tickets" className="btn primary" style={{ display: "inline-block", fontSize: 12 }}>
                Ver tickets N2 →
              </Link>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Cómo funciona</h3>
            <ol style={{ paddingLeft: 18, fontSize: 12.5, color: "var(--text-soft)", margin: 0 }}>
              <li>Cliente envía mensaje por {channelDef.label}.</li>
              <li>IA hace <b>triage</b>: detecta intención, módulo SAP, urgencia, categoría.</li>
              <li>IA busca en <b>KB curada</b> y, si no hay match, en <b>RAG documental</b>.</li>
              <li>Responde con pasos. Pide más datos si faltan.</li>
              <li>Si no puede resolver, <b>escala</b> creando un ticket MESA-XXXX con todo el contexto.</li>
              <li>Nivel 2 cierra el ticket con la solución → opcionalmente crea KB article aprobado.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row between" style={{ fontSize: 13 }}>
      <span style={{ color: "var(--text-soft)" }}>{label}</span>
      {value}
    </div>
  );
}

function toPending(m: SupportMessage): PendingMsg {
  return { id: m.id, role: (m.role === "agent" ? "ai" : (m.role as "user" | "ai" | "system")), text: m.text ?? "" };
}

function Bubble({ msg, conversationId, lastUserQuery }: {
  msg: PendingMsg;
  conversationId?: string;
  lastUserQuery?: string;
}) {
  if (msg.role === "system") {
    return (
      <div style={{
        alignSelf: "center",
        background: "rgba(91,141,239,0.10)",
        border: "1px solid rgba(91,141,239,0.30)",
        color: "var(--text-soft)",
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 12.5,
        maxWidth: "85%",
        textAlign: "center",
      }}>
        {msg.text}
      </div>
    );
  }
  const isUser = msg.role === "user";
  const showFeedback = !isUser && !msg.pending && msg.text.length > 0;
  return (
    <div style={{
      alignSelf: isUser ? "flex-end" : "flex-start",
      maxWidth: "78%",
    }}>
      <div style={{
        background: isUser ? "var(--accent)" : "var(--bg-elev)",
        color: isUser ? "white" : "var(--text)",
        padding: "8px 12px",
        borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
        fontSize: 13.5,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
      }}>
        {msg.pending ? <span style={{ opacity: 0.7 }}><span className="spinner" /> escribiendo…</span> :
          isUser ? msg.text : <MarkdownView text={msg.text} />}
      </div>
      {showFeedback && (
        <div style={{ marginTop: 4, paddingLeft: 4 }}>
          <FeedbackButtons
            source="support"
            compact
            conversationId={conversationId}
            messageId={msg.id}
            query={lastUserQuery}
            response={msg.text}
          />
        </div>
      )}
    </div>
  );
}
