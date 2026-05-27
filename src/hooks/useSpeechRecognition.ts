"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API tipos mínimos para TS (no están en lib.dom por default)
interface SRResult {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
interface SREvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SRErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SRConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

export const DEFAULT_VOICE_LANG = "es-CL";
export const FALLBACK_VOICE_LANG = "es-ES";

export type SRErrorKind =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "aborted"
  | "network"
  | "audio-capture"
  | "service-not-allowed"
  | "unknown";

function mapError(code: string): SRErrorKind {
  switch (code) {
    case "not-allowed":
    case "permission-denied":     return "permission-denied";
    case "no-speech":             return "no-speech";
    case "aborted":               return "aborted";
    case "network":               return "network";
    case "audio-capture":         return "audio-capture";
    case "service-not-allowed":   return "service-not-allowed";
    default:                       return "unknown";
  }
}

export const SR_ERROR_MESSAGES: Record<SRErrorKind, string> = {
  "not-supported":
    "El reconocimiento de voz no está disponible en este navegador. Puedes usar el chat escrito.",
  "permission-denied":
    "No se pudo acceder al micrófono. Revisa los permisos del navegador o escribe tu consulta manualmente.",
  "no-speech":
    "No se detectó voz. Vuelve a intentarlo hablando más cerca del micrófono.",
  "aborted":
    "Reconocimiento detenido.",
  "network":
    "Error de red al usar el reconocimiento de voz. Reintenta o usa texto.",
  "audio-capture":
    "No se pudo capturar audio. Verifica que el micrófono esté conectado.",
  "service-not-allowed":
    "El servicio de reconocimiento no está permitido en este contexto.",
  "unknown":
    "Ocurrió un error con el reconocimiento de voz.",
};

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: SRErrorKind | null;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const {
    lang = DEFAULT_VOICE_LANG,
    continuous = false,
    interimResults = true,
  } = opts;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<SRErrorKind | null>(null);

  const recogRef = useRef<SpeechRecognitionInstance | null>(null);

  // Setup SSR-safe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const r = new Ctor();
    r.lang = lang;
    r.continuous = continuous;
    r.interimResults = interimResults;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    r.onresult = (event) => {
      let interim = "";
      let finalPart = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) {
          finalPart += txt;
        } else {
          interim += txt;
        }
      }
      if (finalPart) {
        setFinalTranscript((prev) => (prev ? prev + " " : "") + finalPart.trim());
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };
    r.onerror = (e) => {
      const kind = mapError(e.error);
      // "aborted" y "no-speech" son frecuentes y no siempre son errores duros.
      if (kind !== "aborted") setError(kind);
      setIsListening(false);
    };
    r.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recogRef.current = r;
    return () => {
      try { r.abort(); } catch { /* noop */ }
      recogRef.current = null;
    };
  }, [lang, continuous, interimResults]);

  const startListening = useCallback(() => {
    if (!recogRef.current) {
      if (!isSupported) setError("not-supported");
      return;
    }
    setError(null);
    setInterimTranscript("");
    try {
      recogRef.current.start();
    } catch {
      // Ya está corriendo
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recogRef.current) return;
    try { recogRef.current.stop(); } catch { /* noop */ }
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  const transcript = (finalTranscript + (interimTranscript ? " " + interimTranscript : "")).trim();

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    errorMessage: error ? SR_ERROR_MESSAGES[error] : null,
    startListening,
    stopListening,
    resetTranscript,
  };
}
