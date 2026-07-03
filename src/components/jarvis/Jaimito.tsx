"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { sendChat } from "@/services/agent.api";
import { beep, blip } from "@/lib/sounds";
import { shortenForTTS, cleanForTTS } from "@/lib/tts";
import type { Environment } from "@/types";
import { useMagnetic } from "@/hooks/useMagnetic";

interface Turn { id: string; role: "user" | "agent"; text: string; ts: number; nav?: string }

// Patrones de navegación: si el usuario menciona estas palabras, llevamos a esa ruta antes de pedir al agente
const NAV_KEYWORDS: Array<{ kw: RegExp; href: string; spoken: string }> = [
  { kw: /war[\s-]?room|globo|mapa mundial/i,     href: "/war-room",      spoken: "Abriendo war room"           },
  { kw: /brain|cerebro|neuronal/i,               href: "/brain",         spoken: "Mostrando el cerebro del agente" },
  { kw: /terminal|bloomberg/i,                   href: "/terminal",      spoken: "Abriendo el terminal"            },
  { kw: /hud|arc reactor|iron man/i,             href: "/hud",           spoken: "Mostrando el arc reactor"        },
  { kw: /launch[\s-]?pad|mission control|countdown/i, href: "/launchpad",  spoken: "Abriendo mission launchpad"   },
  { kw: /wallboard|quad[\s-]?view|presentaci[oó]n/i,  href: "/wallboard",  spoken: "Activando wallboard"          },
  { kw: /topology|topolog[ií]a/i,                href: "/topology",       spoken: "Abriendo topology"             },
  { kw: /mission[\s-]?control/i,                  href: "/mission-control", spoken: "Abriendo mission control"     },
  { kw: /executive|c-level|directiv/i,            href: "/executive",     spoken: "Abriendo el ejecutivo"          },
  { kw: /dashboard|inicio|home/i,                 href: "/dashboard",     spoken: "Abriendo el dashboard"          },
  { kw: /tickets?/i,                              href: "/tickets",       spoken: "Mostrando tickets"              },
  { kw: /reuniones?|meetings?/i,                  href: "/meetings",      spoken: "Mostrando reuniones"            },
  { kw: /historial|hist[oó]rico|incidents?/i,     href: "/history",       spoken: "Mostrando historial"            },
  { kw: /soporte|mesa de soporte|support[\s-]?desk/i, href: "/support-desk", spoken: "Abriendo mesa de soporte"     },
  { kw: /conocimiento|knowledge|kb/i,             href: "/knowledge",     spoken: "Abriendo base de conocimiento"  },
  { kw: /integraciones?|webhook|slack/i,          href: "/integrations",  spoken: "Mostrando integraciones"        },
  { kw: /forecast|predic|pron[oó]stico|ma[ñn]ana/i, href: "/forecast",    spoken: "Abriendo el forecast"           },
];

interface JaimitoProps {
  client?: string;
  environment?: Environment;
}

export default function Jaimito({ client = "DEMO", environment = "DEV" }: JaimitoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sr = useSpeechRecognition({ lang: "es-CL", continuous: false, interimResults: true });
  const tts = useSpeechSynthesis();
  const fabRef = useMagnetic<HTMLButtonElement>(12);
  const wasListeningRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // No mostrar en /agent/voice (ya tiene su propio modo voz), /login, /signup
  const hidden = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/agent/voice") || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/wallboard");
  }, [pathname]);

  // Auto-submit cuando termina de hablar
  useEffect(() => {
    if (wasListeningRef.current && !sr.isListening) {
      const final = sr.finalTranscript.trim();
      if (final) {
        setInput(final);
        setTimeout(() => handleSend(final), 100);
      }
    }
    wasListeningRef.current = sr.isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr.isListening, sr.finalTranscript]);

  // Scroll al fondo cuando llegan turnos
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Saludo inicial al abrir — siempre arranca con la frase de Jaimito
  useEffect(() => {
    if (open && turns.length === 0) {
      const greeting = "¿Qué pasa pues weón? Soy Jaimito, dime qué buscai: te abro vistas, te respondo por voz, o le pregunto al agente AMS por ti.";
      setTurns([{ id: `g-${Date.now()}`, role: "agent", text: greeting, ts: Date.now() }]);
      if (tts.isSupported) tts.speak(cleanForTTS(greeting));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  async function handleSend(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput("");
    sr.resetTranscript();
    if (tts.isSpeaking) tts.stop();

    // Detect comando de navegación
    const nav = NAV_KEYWORDS.find((n) => n.kw.test(msg));
    const userTurn: Turn = { id: uid(), role: "user", text: msg, ts: Date.now() };
    setTurns((t) => [...t, userTurn]);

    if (nav && /(ir a|abr[ie]|muestra|mu[ée]strame|ll[eé]vame|navega a|ve a)/i.test(msg)) {
      const reply = nav.spoken;
      setTurns((t) => [...t, { id: uid(), role: "agent", text: reply, ts: Date.now(), nav: nav.href }]);
      if (tts.isSupported) tts.speak(cleanForTTS(reply));
      beep();
      setTimeout(() => router.push(nav.href), 500);
      return;
    }

    setLoading(true);
    blip();
    const r = await sendChat({ message: msg, user: "Jaimito user", module: "NO_INFORMADO", client, environment });
    setLoading(false);

    if ("success" in r && r.success) {
      const full = r.response;
      const spoken = shortenForTTS(full, 400);
      setTurns((t) => [...t, { id: uid(), role: "agent", text: full, ts: Date.now() }]);
      if (tts.isSupported) tts.speak(spoken);
    } else {
      const err = "error" in r ? r.error : "Sin respuesta";
      setTurns((t) => [...t, { id: uid(), role: "agent", text: `⚠ ${err}`, ts: Date.now() }]);
    }
  }

  function toggleListen() {
    if (sr.isListening) sr.stopListening();
    else {
      sr.resetTranscript();
      if (tts.isSpeaking) tts.stop();
      sr.startListening();
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        ref={fabRef}
        className={`jarvis-fab ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Asistente Jaimito"
        title="Jaimito · ¿qué pasa pues weón?"
      >
        <span className="jarvis-fab-ring" />
        <span className="jarvis-fab-core">{open ? "✕" : "🤖"}</span>
      </button>

      {/* Panel */}
      <div className={`jarvis-panel ${open ? "open" : ""}`} role="dialog" aria-label="Jaimito">
        <div className="jarvis-head">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#4589ff", textShadow: "0 0 8px rgba(69,137,255,0.6)" }}>◤ JAIMITO</div>
            <div style={{ fontSize: 9.5, color: "#67e8f9", letterSpacing: 1.5 }}>AMS · CONVERSATIONAL OPS</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className={`jarvis-dot ${tts.isSpeaking ? "speaking" : ""}`} title={tts.isSpeaking ? "hablando" : "idle"} />
            <span className={`jarvis-dot ${sr.isListening ? "listening" : ""}`} title={sr.isListening ? "escuchando" : "idle"} />
          </div>
        </div>

        <div className="jarvis-body" ref={bodyRef}>
          {turns.map((t) => (
            <div key={t.id} className={`jarvis-turn ${t.role}`}>
              <div style={{ fontSize: 9, color: t.role === "user" ? "#67e8f9" : "#c084fc", letterSpacing: 1.5, marginBottom: 2 }}>
                {t.role === "user" ? "▸ YOU" : "◀ JARVIS"} · {new Date(t.ts).toLocaleTimeString()}
              </div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5 }}>{t.text}</div>
              {t.nav && (
                <div style={{ fontSize: 10, marginTop: 4, color: "#10b981" }}>
                  → navegando a <code style={{ color: "#4589ff" }}>{t.nav}</code>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="jarvis-turn agent">
              <div style={{ fontSize: 9, color: "#c084fc", letterSpacing: 1.5, marginBottom: 2 }}>◀ JARVIS · pensando…</div>
              <div className="jarvis-thinking"><span /><span /><span /></div>
            </div>
          )}
        </div>

        <div className="jarvis-input-row">
          <button onClick={toggleListen} disabled={!sr.isSupported || loading} className={`jarvis-mic ${sr.isListening ? "active" : ""}`} aria-label={sr.isListening ? "Detener" : "Hablar"}>
            {sr.isListening ? "■" : "🎙"}
          </button>
          <input
            type="text"
            className="jarvis-text"
            placeholder={sr.isListening ? sr.transcript || "escuchando…" : "habla o escribe (ej. 've al war room')"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(input); }}
            disabled={loading}
          />
          <button onClick={() => handleSend(input)} disabled={loading || !input.trim()} className="jarvis-send">▶</button>
        </div>

        {/* Quick chips */}
        <div className="jarvis-chips">
          {[
            { label: "🌐 war room",    text: "ir al war room" },
            { label: "🧠 brain",        text: "muestra el brain" },
            { label: "🚀 launchpad",    text: "ir a launchpad" },
            { label: "📊 sla hoy",      text: "cuál es el SLA actual del soporte" },
            { label: "🔮 forecast",     text: "ir al forecast" },
          ].map((c) => (
            <button key={c.label} className="jarvis-chip" onClick={() => handleSend(c.text)} disabled={loading}>{c.label}</button>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .jarvis-fab {
          position: fixed; bottom: 18px; right: 18px; z-index: 9000;
          width: 60px; height: 60px;
          border-radius: 50%; border: 0;
          cursor: pointer;
          background: radial-gradient(circle at 50% 35%, #4589ff, #1e293b 75%);
          color: white; font-size: 24px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 24px rgba(0,0,0,0.45), 0 0 30px rgba(69,137,255,0.45);
          transition: transform .2s, box-shadow .2s;
        }
        .jarvis-fab:hover { transform: scale(1.05); box-shadow: 0 6px 30px rgba(0,0,0,0.5), 0 0 40px rgba(69,137,255,0.7); }
        .jarvis-fab.open { background: radial-gradient(circle at 50% 35%, #a855f7, #1e293b 75%); box-shadow: 0 6px 30px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.6); }
        .jarvis-fab-ring {
          position: absolute; inset: -4px; border-radius: 50%;
          border: 2px solid rgba(69,137,255,0.5);
          animation: jarvisRing 2.5s ease-out infinite;
        }
        .jarvis-fab.open .jarvis-fab-ring { border-color: rgba(168,85,247,0.5); }
        @keyframes jarvisRing {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .jarvis-fab-core { position: relative; z-index: 1; }

        .jarvis-panel {
          position: fixed;
          right: 18px; bottom: 90px;
          width: 380px; max-width: 92vw; height: 520px; max-height: 80vh;
          background: linear-gradient(180deg, rgba(4,6,15,0.97), rgba(15,23,42,0.95));
          border: 1px solid rgba(69,137,255,0.45);
          border-radius: 10px;
          padding: 12px;
          color: #cbd5e1;
          font-family: var(--font-mono, "Consolas", monospace);
          backdrop-filter: blur(6px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(69,137,255,0.15);
          opacity: 0; visibility: hidden;
          transform: translateY(20px) scale(0.96);
          transition: all 0.22s ease-out;
          display: flex; flex-direction: column;
          z-index: 8999;
        }
        .jarvis-panel.open {
          opacity: 1; visibility: visible;
          transform: translateY(0) scale(1);
        }
        .jarvis-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 8px 10px;
          border-bottom: 1px solid rgba(69,137,255,0.18);
          margin-bottom: 8px;
        }
        .jarvis-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #475569;
          transition: background .2s;
        }
        .jarvis-dot.speaking { background: #a855f7; box-shadow: 0 0 8px #a855f7; animation: pulse 1s ease-in-out infinite; }
        .jarvis-dot.listening { background: #fa4d56; box-shadow: 0 0 8px #fa4d56; animation: pulse 1s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .jarvis-body {
          flex: 1; overflow-y: auto;
          padding: 4px 4px 4px 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .jarvis-turn {
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(255,255,255,0.02);
        }
        .jarvis-turn.user { border-left: 2px solid #4589ff; }
        .jarvis-turn.agent { border-left: 2px solid #a855f7; background: rgba(168,85,247,0.05); }

        .jarvis-thinking { display: inline-flex; gap: 4px; }
        .jarvis-thinking span {
          width: 6px; height: 6px; border-radius: 50%; background: #a855f7;
          animation: thinkBounce 1s ease-in-out infinite;
        }
        .jarvis-thinking span:nth-child(2) { animation-delay: 0.15s; }
        .jarvis-thinking span:nth-child(3) { animation-delay: 0.30s; }
        @keyframes thinkBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%           { transform: translateY(-4px); opacity: 1; }
        }

        .jarvis-input-row {
          display: flex; gap: 6px; margin-top: 8px;
        }
        .jarvis-mic, .jarvis-send {
          background: rgba(69,137,255,0.10);
          border: 1px solid rgba(69,137,255,0.4);
          color: #4589ff;
          width: 36px; height: 36px;
          border-radius: 6px;
          cursor: pointer; font-size: 14px;
          transition: all .15s;
        }
        .jarvis-mic.active { background: #fa4d56; color: white; border-color: #fa4d56; box-shadow: 0 0 12px rgba(250,77,86,0.6); }
        .jarvis-mic:disabled, .jarvis-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .jarvis-text {
          flex: 1;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(69,137,255,0.25);
          color: #cbd5e1;
          padding: 0 10px;
          font-family: inherit;
          font-size: 12px;
          border-radius: 6px;
          outline: none;
        }
        .jarvis-text:focus { border-color: #4589ff; box-shadow: 0 0 0 2px rgba(69,137,255,0.15); }

        .jarvis-chips {
          display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px;
        }
        .jarvis-chip {
          background: rgba(69,137,255,0.06);
          border: 1px solid rgba(69,137,255,0.18);
          color: #67e8f9;
          padding: 2px 8px;
          font-size: 10px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.5px;
          transition: background .15s;
        }
        .jarvis-chip:hover { background: rgba(69,137,255,0.18); }
        .jarvis-chip:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </>
  );
}
