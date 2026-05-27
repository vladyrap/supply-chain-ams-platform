"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { usePlatform } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { sendChat } from "@/services/agent.api";
import { shortenForTTS } from "@/lib/tts";

type Turn = {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
};

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Uso `shortenForTTS` desde @/lib/tts (compartido con SpeechPlayer).
// Quita markdown completo, normaliza puntuación y respeta solo comas/puntos.

export default function AgentVoicePage() {
  const { client, environment } = usePlatform();
  const { user } = useAuth();

  const sr = useSpeechRecognition({ lang: "es-CL", continuous: false, interimResults: true });
  const tts = useSpeechSynthesis();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef<string>("");

  // Auto-submit al cerrar el reconocimiento (sr.isListening: true → false con final no vacío)
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (wasListeningRef.current && !sr.isListening) {
      // se acaba de detener
      const final = sr.finalTranscript.trim();
      if (autoSubmit && final && final !== lastSentRef.current) {
        lastSentRef.current = final;
        handleSubmit(final);
      }
    }
    wasListeningRef.current = sr.isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr.isListening, sr.finalTranscript, autoSubmit]);

  async function handleSubmit(text: string) {
    setError(null);
    setLoading(true);
    setTurns((t) => [...t, { id: uid(), role: "user", text, ts: Date.now() }]);
    const r = await sendChat({
      message: text,
      user: user?.name || "Usuario voz",
      module: "NO_INFORMADO",
      client: client.trim() || "NO_INFORMADO",
      environment,
    });
    setLoading(false);
    if ("success" in r && r.success) {
      const reply = r.response;
      setTurns((t) => [...t, { id: uid(), role: "agent", text: reply, ts: Date.now() }]);
      if (autoSpeak && tts.isSupported) tts.speak(shortenForTTS(reply));
    } else {
      const msg = "error" in r ? r.error : "Error desconocido";
      setError(msg);
      setTurns((t) => [...t, { id: uid(), role: "agent", text: `⚠ ${msg}`, ts: Date.now() }]);
    }
  }

  function toggleListening() {
    if (sr.isListening) { sr.stopListening(); return; }
    sr.resetTranscript();
    if (tts.isSpeaking) tts.stop();
    sr.startListening();
  }

  const supported = sr.isSupported && tts.isSupported;
  const status = sr.isListening ? "escuchando…" :
                 loading        ? "el agente piensa…" :
                 tts.isSpeaking ? "hablando…" :
                 "listo · pulsa para hablar";

  return (
    <div>
      <div className="page-title">
        <h1>🎙 Agente AMS — Modo voz</h1>
        <p>Habla con el agente y escucha su diagnóstico. Reconocimiento de voz local (Web Speech API), respuesta hablada con la voz del navegador.</p>
      </div>

      {!supported && (
        <div className="alert error" style={{ marginBottom: 14 }}>
          Tu navegador no soporta {!sr.isSupported && "reconocimiento de voz"}{!sr.isSupported && !tts.isSupported && " ni "}{!tts.isSupported && "síntesis de voz"}.
          Usa Chrome o Edge en escritorio. Mientras tanto, <Link href="/agent">vuelve al modo texto</Link>.
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge variant={sr.isSupported ? "ok" : "error"}>STT {sr.isSupported ? "OK" : "no soportado"}</Badge>
        <Badge variant={tts.isSupported ? "ok" : "error"}>TTS {tts.isSupported ? "OK" : "no soportado"}</Badge>
        <Badge variant="tech">cliente {client || "—"}</Badge>
        <Badge variant="muted">ambiente {environment}</Badge>
        {tts.selectedVoice && <Badge variant="info">voz: {tts.selectedVoice.name}</Badge>}
      </div>

      {/* Botón gigante PTT */}
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 32, marginBottom: 18 }}>
        <button
          onClick={toggleListening}
          disabled={!supported || loading}
          aria-pressed={sr.isListening}
          style={{
            width: 180, height: 180, borderRadius: "50%",
            background: sr.isListening
              ? "radial-gradient(circle at 50% 35%, #ef4444, #b91c1c)"
              : loading
                ? "radial-gradient(circle at 50% 35%, #6b7280, #374151)"
                : "radial-gradient(circle at 50% 35%, #3b82f6, #1d4ed8)",
            border: "none",
            color: "white",
            fontSize: 64,
            cursor: supported && !loading ? "pointer" : "not-allowed",
            boxShadow: sr.isListening
              ? "0 0 0 8px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.5)"
              : "0 8px 24px rgba(0,0,0,0.3)",
            animation: sr.isListening ? "pulse 1.4s ease-in-out infinite" : "none",
            transition: "transform .1s",
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {sr.isListening ? "⏸" : loading ? "…" : "🎙"}
        </button>
        <div style={{ marginTop: 18, fontSize: 14, color: "var(--text-soft)", textAlign: "center" }}>
          {status}
        </div>
        {sr.transcript && (
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", maxWidth: 600, textAlign: "center" }}>
            “{sr.transcript}”
          </div>
        )}
        {sr.errorMessage && (
          <div className="alert error" style={{ marginTop: 12, fontSize: 12.5 }}>{sr.errorMessage}</div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.5); }
          50%      { box-shadow: 0 0 0 20px rgba(239,68,68,0.05), 0 0 60px rgba(239,68,68,0.7); }
        }
      `}</style>

      {/* Controles secundarios */}
      <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <label className="toggle">
          <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
          <span className="track" />
          <span>Auto-enviar al terminar de hablar</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} />
          <span className="track" />
          <span>Leer respuesta en voz alta</span>
        </label>
        {tts.isSpeaking && (
          <button className="btn ghost" onClick={tts.stop} style={{ marginLeft: "auto" }}>
            ⏹ detener voz
          </button>
        )}
        {sr.finalTranscript && !sr.isListening && !autoSubmit && (
          <button className="btn primary" onClick={() => handleSubmit(sr.finalTranscript)} disabled={loading}>
            Enviar al agente
          </button>
        )}
        {error && <div className="alert error" style={{ width: "100%" }}>{error}</div>}
      </div>

      {/* Transcripción */}
      {turns.length > 0 && (
        <div className="card" style={{ maxHeight: "50vh", overflowY: "auto" }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Transcripción de la sesión</h3>
            <button className="btn ghost" onClick={() => setTurns([])} style={{ padding: "2px 10px", fontSize: 12 }}>
              limpiar
            </button>
          </div>
          <div className="col" style={{ gap: 10 }}>
            {turns.map((t) => (
              <div key={t.id} className={`msg ${t.role}`}>
                <div className="meta" style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 2 }}>
                  {t.role === "user" ? "🗣 Tú" : "🤖 Agente"} · {new Date(t.ts).toLocaleTimeString()}
                </div>
                <div className="body" style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{t.text}</div>
                {t.role === "agent" && tts.isSupported && (
                  <button
                    className="btn ghost"
                    style={{ marginTop: 6, padding: "2px 10px", fontSize: 11 }}
                    onClick={() => tts.speak(shortenForTTS(t.text))}
                  >
                    🔊 reproducir
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
