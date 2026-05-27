"use client";

import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import type { ChatMessage } from "@/types";

export default function MessageList({ messages, loading }: { messages: ChatMessage[]; loading: boolean }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, messages[messages.length - 1]?.text.length]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="alert info">
        Aún no has consultado al agente. Describe un incidente SAP Supply Chain o usa el modo voz.
      </div>
    );
  }

  // En modo streaming, el último mensaje del agente puede estar vacío mientras
  // espera el primer chunk. Mostramos el spinner "Procesando..." solo cuando
  // loading=true Y el último mensaje del agente sigue sin tener texto.
  const last = messages[messages.length - 1];
  const streamingPending =
    loading && last && last.role === "agent" && last.text.length === 0;

  return (
    <div className="msglist" aria-live="polite">
      {messages.map((m, i) => {
        const isLast = i === messages.length - 1;
        const isAgentStreaming = loading && isLast && m.role === "agent" && m.text.length > 0;
        return (
          <MessageItem key={m.id} msg={m} streaming={isAgentStreaming} />
        );
      })}
      {streamingPending && (
        <div className="msg agent" aria-busy="true" style={{ marginTop: -8 }}>
          <div className="body" style={{ color: "var(--text-soft)" }}>
            <span className="spinner" /> Conectando con el modelo…
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
