"use client";

import { useCallback, useEffect, useState } from "react";
import MessageList from "./MessageList";
import AttachmentPicker from "./AttachmentPicker";
import VoiceControls from "@/components/voice/VoiceControls";
import SpeechPlayer from "@/components/voice/SpeechPlayer";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { sendChat, sendChatStream, sendResearch, type ToolCallSummary } from "@/services/agent.api";
import type { Attachment, AttachmentPreview, ChatMessage, SapModule } from "@/types";

const CHAT_HISTORY_KEY = "ams-chat-history-v2";
// Solo persistimos el ÚLTIMO par usuario+agente (la conversación en curso).
// El histórico completo vive en /history (servido desde la DB del backend).
const HISTORY_MAX = 2;

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ChatMessage[]).slice(-HISTORY_MAX) : [];
  } catch { return []; }
}
function saveHistory(msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    // No persistimos attachments (base64 puede pesar mucho en localStorage).
    const trimmed = msgs.slice(-HISTORY_MAX).map((m) => ({ ...m, attachments: undefined }));
    window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* ignore quota */ }
}

const SAP_MODULES: SapModule[] = [
  "NO_INFORMADO", "MM", "SD", "PP", "WM", "EWM",
  "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION",
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function previewToAttachment(p: AttachmentPreview): Attachment {
  // dataUrl viene como "data:image/png;base64,XXXX". Cortamos el prefijo para mandar solo base64.
  const comma = p.dataUrl.indexOf(",");
  const data = comma >= 0 ? p.dataUrl.slice(comma + 1) : p.dataUrl;
  return {
    name: p.name,
    mimeType: p.mimeType,
    sizeBytes: p.sizeBytes,
    dataBase64: data,
  };
}

export default function ChatPanel() {
  const { client, environment, autoSpeak, setAutoSpeak } = usePlatform();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [module, setModule] = useState<SapModule>("NO_INFORMADO");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Modo investigación con tool-use (Gemini function calling)
  const [useResearch, setUseResearch] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ams-research-mode") === "true";
  });
  const [researchStatus, setResearchStatus] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ams-research-mode", String(useResearch));
  }, [useResearch]);
  // finalAgentText: solo se setea cuando el stream del agente terminó (onDone).
  // Es lo que alimenta la auto-lectura por voz — evita disparar speak() en cada delta.
  const [finalAgentText, setFinalAgentText] = useState<string | null>(null);

  // Hidratar historial desde localStorage al primer render del cliente
  useEffect(() => {
    const hist = loadHistory();
    setMessages(hist);
    // Si el último mensaje del histórico es del agente, dejarlo disponible para lectura manual
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].role === "agent") { setFinalAgentText(hist[i].text); break; }
    }
  }, []);
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Cuando llega el user autenticado, prellenar el campo "Usuario" si está vacío
  useEffect(() => {
    if (user && !userName) setUserName(user.name || user.email);
  }, [user, userName]);

  const onTranscriptChange = useCallback((text: string) => {
    setDraft(text);
  }, []);

  async function handleSend() {
    const message = draft.trim();
    if ((!message && attachments.length === 0) || loading) return;
    if (!message && attachments.length > 0) {
      setError("Agrega una descripción del incidente. Las imágenes solas no son suficientes.");
      return;
    }
    setError(null);

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text: message,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      createdAt: new Date().toISOString(),
    };
    const pendingAttachments = attachments.map(previewToAttachment);

    // Reservamos un mensaje del agente vacío que iremos rellenando con cada delta.
    const agentMsgId = uid();
    const agentSeed: ChatMessage = {
      id: agentMsgId,
      role: "agent",
      text: "",
      createdAt: new Date().toISOString(),
    };

    // Solo guardamos el último par (la consulta anterior se pierde de la vista
    // pero queda en /history). Quitamos cualquier mensaje previo.
    setMessages([userMsg, agentSeed]);
    setFinalAgentText(null);  // resetea para que SpeechPlayer sepa "no leer aún"
    setDraft("");
    setAttachments([]);
    setLoading(true);

    let streamError: string | null = null;
    let accumulated = "";

    if (useResearch) {
      // ============================================================
      // RESEARCH MODE — tool-use sin streaming
      // ============================================================
      setResearchStatus("🔬 Investigando con herramientas… (puede tomar 10–30s)");
      const res = await sendResearch({
        message,
        user: userName.trim() || "anonymous",
        module,
        client: client.trim() || "NO_INFORMADO",
        environment,
        attachments: pendingAttachments,
      });
      setResearchStatus("");

      if (!("success" in res) || !res.success) {
        streamError = "error" in res ? res.error : "Error en research mode";
      } else {
        accumulated = res.response;
        // Anexar tool calls + texto al mensaje del agente
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  text: res.response,
                  metadata: {
                    model: res.metadata.model + " (research)",
                    timestamp: res.metadata.timestamp,
                    confidence: res.metadata.confidence,
                    // Inyectamos las tool calls como metadata extra, MessageItem las renderiza
                    toolCalls: res.metadata.toolCalls,
                    iterations: res.metadata.iterations,
                  } as ChatMessage["metadata"] & { toolCalls: ToolCallSummary[]; iterations: number },
                  createdAt: res.metadata.timestamp || m.createdAt,
                }
              : m
          )
        );
        setFinalAgentText(res.response);
      }
    } else {
      // ============================================================
      // STREAMING MODE — chat normal con SSE
      // ============================================================
      await sendChatStream(
        {
          message,
          user: userName.trim() || "anonymous",
          module,
          client: client.trim() || "NO_INFORMADO",
          environment,
          attachments: pendingAttachments,
        },
        {
          onDelta: (chunk) => {
            accumulated += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === agentMsgId ? { ...m, text: m.text + chunk } : m))
            );
          },
          onDone: (ev) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, metadata: ev.metadata, createdAt: ev.metadata.timestamp || m.createdAt }
                  : m
              )
            );
            setFinalAgentText(accumulated);
          },
          onError: (err) => { streamError = err; },
        }
      );
    }

    setLoading(false);

    if (streamError) {
      setMessages((prev) => prev.filter((m) => m.id !== agentMsgId));
      setError(streamError);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !loading && draft.trim().length > 0;

  return (
    <div className="chat-wrap">
      {/* Columna izquierda: SOLO el último par + composer */}
      <div className="col" style={{ gap: 14 }}>
        <div className="card">
          <MessageList messages={messages} loading={loading} />
          {messages.length > 0 && (
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <Link
                href="/history"
                className="badge muted"
                style={{ textDecoration: "none", fontSize: 11 }}
                title="Ver conversaciones anteriores en el historial"
              >
                📜 ver historial completo →
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="lab" htmlFor="usr">Usuario</label>
              <input
                id="usr"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="consultor_ams"
              />
            </div>
            <div style={{ width: 160 }}>
              <label className="lab" htmlFor="mod">Módulo SAP</label>
              <select id="mod" value={module} onChange={(e) => setModule(e.target.value as SapModule)}>
                {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <label className="lab" htmlFor="msg">Incidente o pregunta</label>
          <textarea
            id="msg"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe el incidente, dictalo con voz o adjunta capturas del error SAP. (Ctrl+Enter envía)"
            maxLength={8000}
            disabled={loading}
          />

          <div style={{ marginTop: 10 }}>
            <AttachmentPicker
              attachments={attachments}
              onChange={setAttachments}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="alert error" style={{ marginTop: 10 }}>
              <b>Error:</b> {error}
            </div>
          )}

          {researchStatus && (
            <div className="alert info" style={{ marginTop: 10, fontSize: 12.5 }}>
              {researchStatus}
            </div>
          )}

          <div className="row between" style={{ marginTop: 12, flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-soft)" }}>
              {draft.length} / 8000 · cliente <b>{client || "—"}</b> · ambiente <b>{environment}</b>
              {attachments.length > 0 && (
                <> · 📎 <b>{attachments.length}</b> imagen{attachments.length === 1 ? "" : "es"}</>
              )}
            </span>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <label
                className="toggle"
                title="El agente invoca herramientas (SAP read-only, KB, RAG) por su cuenta. Tarda más pero entrega análisis con datos reales."
                style={{ fontSize: 12 }}
              >
                <input
                  type="checkbox"
                  checked={useResearch}
                  onChange={(e) => setUseResearch(e.target.checked)}
                  disabled={loading}
                />
                <span className="track" />
                <span>🔬 Investigar con tools</span>
              </label>
              <button
                type="button"
                className="btn primary"
                onClick={handleSend}
                disabled={!canSend}
              >
                {loading ? <><span className="spinner" /> {useResearch ? "Investigando…" : "Enviando…"}</> : (useResearch ? "Investigar →" : "Enviar al agente →")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha: voz */}
      <div className="col" style={{ gap: 14 }}>
        <VoiceControls onTranscriptChange={onTranscriptChange} disabled={loading} />
        <SpeechPlayer
          text={finalAgentText}
          isStreaming={loading}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={setAutoSpeak}
        />
      </div>
    </div>
  );
}
