"use client";

// Hook para grabar pantalla con APIs nativas del navegador.
// getDisplayMedia + MediaRecorder. Sin backend, sin upload.
// Devuelve ObjectURL que vive solo durante la sesión actual.

import { useCallback, useEffect, useRef, useState } from "react";

export interface ScreenRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  durationSeconds: number;
  mimeType: string | null;
  error: string | null;
  startRecording: (opts?: { audio?: boolean }) => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  downloadRecording: (suggestedName?: string) => void;
}

// Cascada de codecs (Chrome/Edge mejor con vp9, fallback vp8, fallback mp4)
const PREFERRED_MIMES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264",
  "video/webm",
  "video/mp4",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of PREFERRED_MIMES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch { /* ignore */ }
  }
  return null;
}

export function useScreenRecorder(): ScreenRecorderResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function" &&
      typeof window.MediaRecorder !== "undefined";
    setIsSupported(supported);
  }, []);

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      try { tickRef.current && clearInterval(tickRef.current); } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      try { if (recordedUrl) URL.revokeObjectURL(recordedUrl); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async (opts: { audio?: boolean } = {}) => {
    if (!isSupported) {
      setError("Tu navegador no soporta grabación de pantalla.");
      return;
    }
    setError(null);
    setRecordedBlob(null);
    if (recordedUrl) {
      try { URL.revokeObjectURL(recordedUrl); } catch { /* ignore */ }
    }
    setRecordedUrl(null);
    setDurationSeconds(0);

    try {
      const constraints: DisplayMediaStreamOptions = {
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: opts.audio !== false,
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      streamRef.current = stream;

      const chosenMime = pickMimeType();
      setMimeType(chosenMime);
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chosenMime || "video/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        // detener tracks de la pantalla
        try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        streamRef.current = null;
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      };

      // si el usuario detiene desde el chrome de selección, también frenamos
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
          setIsRecording(false);
        });
      });

      startTimeRef.current = Date.now();
      recorder.start(1000); // chunk cada segundo
      setIsRecording(true);

      tickRef.current = setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`No se pudo iniciar la grabación: ${msg}`);
      setIsRecording(false);
    }
  }, [isSupported, recordedUrl]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch { /* ignore */ }
    setIsRecording(false);
  }, []);

  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      try { URL.revokeObjectURL(recordedUrl); } catch { /* ignore */ }
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDurationSeconds(0);
    setError(null);
  }, [recordedUrl]);

  const downloadRecording = useCallback((suggestedName?: string) => {
    if (!recordedBlob || !recordedUrl) return;
    const a = document.createElement("a");
    const ext = (mimeType || "video/webm").includes("mp4") ? "mp4" : "webm";
    a.href = recordedUrl;
    a.download = (suggestedName || `screen-recording-${Date.now()}`).replace(/\.(webm|mp4)$/i, "") + "." + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [recordedBlob, recordedUrl, mimeType]);

  return {
    isSupported, isRecording, recordedBlob, recordedUrl,
    durationSeconds, mimeType, error,
    startRecording, stopRecording, resetRecording, downloadRecording,
  };
}
