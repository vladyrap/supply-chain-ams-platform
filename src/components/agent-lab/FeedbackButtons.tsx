"use client";

import { useState } from "react";
import { submitFeedback, type FeedbackSource } from "@/services/agent-lab.api";

interface Props {
  source: FeedbackSource;
  conversationId?: string;
  messageId?: string;
  ticketId?: string;
  query?: string;
  response?: string;
  /** estilo compacto inline para chat bubbles */
  compact?: boolean;
}

/**
 * Botones 👍 / 👎 para capturar feedback humano sobre respuestas del agente.
 * Optimista: se marca local apenas el usuario clickea, luego reintenta si falla.
 * Si es 👎 abre prompt opcional para razón.
 */
export default function FeedbackButtons(props: Props) {
  const { source, conversationId, messageId, ticketId, query, response, compact } = props;
  const [state, setState] = useState<"idle" | "positive" | "negative" | "sending" | "error">("idle");

  async function send(kind: "positive" | "negative") {
    if (state !== "idle") return;
    let reason: string | undefined = undefined;
    if (kind === "negative") {
      const r = window.prompt(
        "¿Qué falló en la respuesta? (opcional, ayuda a entrenar al agente)",
        ""
      );
      if (r === null) return; // canceló
      reason = r.trim() || undefined;
    }
    setState("sending");
    const res = await submitFeedback({
      source, kind, reason,
      conversationId, messageId, ticketId,
      query: query?.slice(0, 2000),
      response: response?.slice(0, 8000),
    });
    if (res.ok) setState(kind);
    else setState("error");
  }

  if (state === "positive") {
    return <span className="lab-fb-tag ok" title="Marcado como buena respuesta">👍 gracias</span>;
  }
  if (state === "negative") {
    return <span className="lab-fb-tag bad" title="Marcado para revisión">👎 anotado</span>;
  }
  if (state === "error") {
    return <span className="lab-fb-tag err" title="Error de red">⚠ error</span>;
  }

  return (
    <div className={`lab-fb-btns${compact ? " compact" : ""}`}>
      <button
        className="lab-fb-btn ok"
        title="Buena respuesta"
        disabled={state === "sending"}
        onClick={() => send("positive")}
        type="button"
      >
        👍
      </button>
      <button
        className="lab-fb-btn bad"
        title="Mala respuesta · necesita curación"
        disabled={state === "sending"}
        onClick={() => send("negative")}
        type="button"
      >
        👎
      </button>
    </div>
  );
}
