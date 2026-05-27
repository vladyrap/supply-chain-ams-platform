"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_VOICE_LANG, FALLBACK_VOICE_LANG } from "./useSpeechRecognition";

interface UseSpeechSynthesisResult {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  setVoice: (uri: string) => void;
  setRate: (n: number) => void;
  setPitch: (n: number) => void;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      setVoices(all);
      setSelectedVoiceUri((current) => {
        // Si el usuario ya tiene una voz local válida elegida, respetar.
        const currentVoice = all.find((v) => v.voiceURI === current);
        if (currentVoice && currentVoice.localService) return current;
        // Prioridad: voces locales del SO en español (las remotas tipo "Google..."
        // suelen dar `not-allowed` en algunos contextos de Chrome). Buscamos en
        // este orden: local es-CL, local es-ES, cualquier local es-*, cualquier
        // local, remota es-CL, remota es-ES, remota es-*, cualquiera.
        const localEs   = all.filter((v) => v.localService && v.lang.toLowerCase().startsWith("es"));
        const remoteEs  = all.filter((v) => !v.localService && v.lang.toLowerCase().startsWith("es"));
        const anyLocal  = all.filter((v) => v.localService);
        const pick =
          localEs.find((v) => v.lang === DEFAULT_VOICE_LANG) ??
          localEs.find((v) => v.lang === FALLBACK_VOICE_LANG) ??
          localEs[0] ??
          anyLocal[0] ??
          remoteEs.find((v) => v.lang === DEFAULT_VOICE_LANG) ??
          remoteEs.find((v) => v.lang === FALLBACK_VOICE_LANG) ??
          remoteEs[0] ??
          all[0];
        return pick?.voiceURI ?? "";
      });
    };

    loadVoices();
    // El evento dispara cuando el SO termina de cargar la lista (Chromium)
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceUri) ?? null;

  // Fallback: si la voz "remota" (Google ...) no arranca en 500ms, reintenta
  // sin voz específica para que el navegador use su default.
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string, opts: { withFallback?: boolean } = { withFallback: true }) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("[tts] speechSynthesis no soportado");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      console.warn("[tts] texto vacío");
      return;
    }
    // Cancelar lo que esté en curso
    window.speechSynthesis.cancel();
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    const make = (useSelected: boolean): SpeechSynthesisUtterance => {
      const u = new SpeechSynthesisUtterance(trimmed);
      if (useSelected && selectedVoice) {
        u.voice = selectedVoice;
        u.lang = selectedVoice.lang;
      } else {
        u.lang = DEFAULT_VOICE_LANG;
      }
      u.rate = rate;
      u.pitch = pitch;
      let started = false;
      u.onstart = () => {
        started = true;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        setIsSpeaking(true);
        setIsPaused(false);
        console.info("[tts] onstart", { voice: u.voice?.name, lang: u.lang, len: trimmed.length });
      };
      u.onpause = () => setIsPaused(true);
      u.onresume = () => setIsPaused(false);
      u.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        console.info("[tts] onend");
      };
      u.onerror = (ev) => {
        setIsSpeaking(false);
        setIsPaused(false);
        const errName = (ev as SpeechSynthesisErrorEvent).error || "unknown";
        console.warn("[tts] onerror", errName, { voice: u.voice?.name, started });
        // Si la voz remota (Google) está bloqueada por el browser y el usuario
        // tenía esa voz seleccionada, cambiamos automáticamente a una voz LOCAL
        // del sistema en español y reintentamos.
        if (errName === "not-allowed" && useSelected && opts.withFallback) {
          const allVoices = window.speechSynthesis.getVoices();
          const localEs = allVoices.find((v) => v.localService && v.lang.toLowerCase().startsWith("es"));
          const anyLocal = allVoices.find((v) => v.localService);
          const replacement = localEs || anyLocal;
          if (replacement) {
            console.info("[tts] sustituyo voz remota bloqueada por local:", replacement.name);
            setSelectedVoiceUri(replacement.voiceURI);
            // Reintento inmediato con la voz local nueva, marcando withFallback=false
            // para no entrar en loop si esta también falla.
            setTimeout(() => {
              const retry = new SpeechSynthesisUtterance(trimmed);
              retry.voice = replacement;
              retry.lang = replacement.lang;
              retry.rate = rate;
              retry.pitch = pitch;
              retry.onstart = () => { setIsSpeaking(true); setIsPaused(false); console.info("[tts] retry onstart"); };
              retry.onend   = () => { setIsSpeaking(false); setIsPaused(false); };
              retry.onerror = (e) => { console.warn("[tts] retry onerror", (e as SpeechSynthesisErrorEvent).error); setIsSpeaking(false); };
              utteranceRef.current = retry;
              window.speechSynthesis.speak(retry);
            }, 50);
          } else {
            console.warn("[tts] no hay voz local disponible; no se puede reintentar");
          }
        }
      };
      return u;
    };

    const primary = make(true);
    utteranceRef.current = primary;
    console.info("[tts] speak()", { voice: primary.voice?.name ?? "(default)", lang: primary.lang, withFallback: opts.withFallback });
    window.speechSynthesis.speak(primary);

    // Fallback timer: si en 500ms onstart no se disparó Y no hubo error, reintenta sin voice.
    if (opts.withFallback && selectedVoice) {
      fallbackTimerRef.current = setTimeout(() => {
        if (!window.speechSynthesis.speaking && utteranceRef.current === primary) {
          console.warn("[tts] fallback timer: la voz", selectedVoice.name, "no arrancó");
          window.speechSynthesis.cancel();
          const fb = make(false);
          utteranceRef.current = fb;
          window.speechSynthesis.speak(fb);
        }
      }, 800);
    }
  }, [selectedVoice, rate, pitch]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    rate,
    pitch,
    setVoice: setSelectedVoiceUri,
    setRate,
    setPitch,
    speak,
    stop,
    pause,
    resume,
  };
}
