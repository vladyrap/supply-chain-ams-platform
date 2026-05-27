"use client";

import { useEffect } from "react";
import Badge from "@/components/ui/Badge";
import { useSpeechRecognition, DEFAULT_VOICE_LANG } from "@/hooks/useSpeechRecognition";

interface Props {
  onTranscriptChange: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceControls({ onTranscriptChange, disabled }: Props) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ lang: DEFAULT_VOICE_LANG, continuous: true, interimResults: true });

  // Propagar transcript al padre cuando cambia el texto final acumulado
  useEffect(() => {
    if (finalTranscript) {
      onTranscriptChange(finalTranscript);
    }
  }, [finalTranscript, onTranscriptChange]);

  if (!isSupported) {
    return (
      <div className="voice-card">
        <div className="row between">
          <strong>Modo voz</strong>
          <Badge variant="muted">no disponible</Badge>
        </div>
        <div className="alert warn">
          Tu navegador no soporta reconocimiento de voz nativo. Puedes seguir usando el chat por texto.
          <br />
          Recomendado: Chrome, Edge o Brave en escritorio.
        </div>
      </div>
    );
  }

  const stateText = isListening
    ? "Escuchando… habla de forma clara y describe el incidente."
    : transcript
      ? "Listo. Revisa el texto antes de enviar."
      : "Voz desactivada. Presiona Iniciar voz para hablar.";

  const stateClass = isListening ? "pulse warn" : transcript ? "pulse" : "pulse muted";

  return (
    <div className="voice-card">
      <div className="row between">
        <strong>Modo voz</strong>
        <div className="row" style={{ gap: 6 }}>
          <Badge variant="tech">STT navegador</Badge>
          <Badge variant="info">{DEFAULT_VOICE_LANG}</Badge>
        </div>
      </div>

      <div className="voice-state" role="status" aria-live="polite">
        <span className={stateClass} aria-hidden="true" />
        <span>{stateText}</span>
      </div>

      {(interimTranscript || finalTranscript) && (
        <div className="transcript-preview">
          {finalTranscript}{" "}
          {interimTranscript && <span className="interim">{interimTranscript}</span>}
        </div>
      )}

      {error && errorMessage && (
        <div className={`alert ${error === "no-speech" ? "warn" : "error"}`}>
          {errorMessage}
        </div>
      )}

      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {!isListening ? (
          <button
            type="button"
            className="btn primary"
            onClick={startListening}
            disabled={disabled}
            aria-label="Iniciar voz"
          >
            🎤 Iniciar voz
          </button>
        ) : (
          <button
            type="button"
            className="btn danger"
            onClick={stopListening}
            aria-label="Detener voz"
          >
            ⏹ Detener voz
          </button>
        )}

        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            resetTranscript();
            onTranscriptChange("");
          }}
          disabled={disabled || (!transcript && !isListening)}
          aria-label="Limpiar transcripción"
        >
          🧹 Limpiar transcripción
        </button>
      </div>

      <div className="alert info" style={{ fontSize: 12 }}>
        La voz se convierte a texto en el navegador. Esta versión <b>no guarda audio</b> y <b>no envía audio al backend</b> — solo el texto transcrito.
      </div>
    </div>
  );
}
