"use client";

import { useEffect, useMemo, useRef } from "react";
import Badge from "@/components/ui/Badge";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

interface Props {
  /** Texto final de la última respuesta del agente. Null si aún no hay. */
  text: string | null;
  /** True mientras el stream del agente está activo. Mientras sea true,
   *  no auto-leemos (el texto cambia con cada chunk). */
  isStreaming?: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: (v: boolean) => void;
}

export default function SpeechPlayer({ text, isStreaming = false, autoSpeak, onToggleAutoSpeak }: Props) {
  const {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    setVoice,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  } = useSpeechSynthesis();

  // Voces en español (prioritarias), luego el resto
  const orderedVoices = useMemo(() => {
    const es = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
    const other = voices.filter((v) => !v.lang.toLowerCase().startsWith("es"));
    return [...es, ...other];
  }, [voices]);

  // Auto-lectura: solo cuando hay texto y NO está streaming (texto estable).
  // Evita que el speak() se cancele en cada delta del stream.
  const lastSpokenRef = useRef<string | null>(null);
  // Detectamos transición off→on del toggle para forzar lectura aunque el
  // texto sea el mismo que la vez anterior (usuario activa toggle después
  // de que llegó la respuesta).
  const prevAutoSpeakRef = useRef(autoSpeak);
  useEffect(() => {
    const justEnabled = !prevAutoSpeakRef.current && autoSpeak;
    prevAutoSpeakRef.current = autoSpeak;

    if (!autoSpeak || !text || isStreaming || !isSupported) return;
    if (!justEnabled && lastSpokenRef.current === text) return;
    lastSpokenRef.current = text;
    speak(text);
  }, [autoSpeak, text, isStreaming, isSupported, speak]);

  if (!isSupported) {
    return (
      <div className="voice-card">
        <div className="row between">
          <strong>Lectura por voz</strong>
          <Badge variant="muted">no disponible</Badge>
        </div>
        <div className="alert warn">
          Tu navegador no soporta lectura de voz. La respuesta seguirá disponible en texto.
        </div>
      </div>
    );
  }

  const stateText = isStreaming
    ? "Esperando respuesta completa…"
    : isSpeaking
      ? (isPaused ? "Pausada." : "Leyendo respuesta…")
      : text
        ? "Listo para leer la última respuesta."
        : "Sin respuesta aún.";

  const stateClass = isStreaming
    ? "pulse warn"
    : isSpeaking
      ? (isPaused ? "pulse muted" : "pulse")
      : "pulse muted";

  return (
    <div className="voice-card">
      <div className="row between">
        <strong>Lectura por voz</strong>
        <Badge variant="tech">TTS navegador</Badge>
      </div>

      <div className="voice-state" role="status" aria-live="polite">
        <span className={stateClass} aria-hidden="true" />
        <span>{stateText}</span>
      </div>

      <label className="toggle">
        <input
          type="checkbox"
          checked={autoSpeak}
          onChange={(e) => onToggleAutoSpeak(e.target.checked)}
        />
        <span className="track" />
        <span>Leer automáticamente cada respuesta del agente</span>
      </label>

      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {!isSpeaking && (
          <button
            type="button"
            className="btn primary"
            onClick={() => text && speak(text)}
            disabled={!text}
            aria-label="Leer respuesta"
          >
            🔊 Leer respuesta
          </button>
        )}
        {isSpeaking && !isPaused && (
          <button type="button" className="btn" onClick={pause} aria-label="Pausar lectura">
            ⏸ Pausar
          </button>
        )}
        {isSpeaking && isPaused && (
          <button type="button" className="btn primary" onClick={resume} aria-label="Reanudar lectura">
            ▶ Reanudar
          </button>
        )}
        {isSpeaking && (
          <button type="button" className="btn danger" onClick={stop} aria-label="Detener lectura">
            ⏹ Detener lectura
          </button>
        )}
      </div>

      <details>
        <summary style={{ cursor: "pointer", color: "var(--text-soft)", fontSize: 12.5 }}>
          Voz y velocidad
        </summary>
        <div className="col" style={{ marginTop: 10, gap: 10 }}>
          <div>
            <label className="lab">Voz</label>
            <select
              value={selectedVoice?.voiceURI ?? ""}
              onChange={(e) => setVoice(e.target.value)}
              aria-label="Seleccionar voz"
            >
              {orderedVoices.length === 0 && <option value="">(sin voces detectadas)</option>}
              {orderedVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} — {v.lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="lab">Velocidad: {rate.toFixed(2)}x</label>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              aria-label="Velocidad de lectura"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
