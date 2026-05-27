"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { boot, beep, launch } from "@/lib/sounds";

interface TourStep {
  href: string;
  title: string;
  narration: string;
  duration: number; // ms
}

const TOUR: TourStep[] = [
  {
    href: "/launchpad",
    title: "Mission Launchpad",
    narration: "Bienvenidos a la plataforma de A M S Supply Chain. Esta es la pantalla de comando: arranca el sistema, muestra el estado de los subsistemas en tiempo real, y un countdown al próximo ciclo operativo. Si hay incumplimiento de S L A, toda la pantalla entra en modo alerta.",
    duration: 24000,
  },
  {
    href: "/war-room",
    title: "War Room 3D",
    narration: "Este es el war room. Vemos un globo terráqueo tridimensional con todos los clientes geolocalizados. Cada vez que entra un incidente, dispara un arco de luz desde el cliente hasta la base de operaciones. Pueden arrastrar el globo con el mouse para rotarlo.",
    duration: 24000,
  },
  {
    href: "/brain",
    title: "Agent Brain",
    narration: "Aquí pueden ver el cerebro del agente como una red neuronal de cinco capas. Cada interacción real con el sistema dispara una señal que viaja por triage, decision, resolver y output. La velocidad de pulsado es el R P M actual del agente.",
    duration: 22000,
  },
  {
    href: "/terminal",
    title: "Bloomberg Terminal",
    narration: "Vista tipo Bloomberg para operadores: una grilla densa de widgets vivos con tickets activos, S L A, tokens consumidos, costo de Gemini, top de módulos S A P, y un log stream estilo Matrix que muestra los eventos a medida que ocurren.",
    duration: 22000,
  },
  {
    href: "/hud",
    title: "Arc Reactor HUD",
    narration: "El arc reactor: el porcentaje de S L A en el centro, rodeado por cuatro anillos giratorios, y cuatro paneles holográficos que muestran agent core, support desk, incidents y knowledge base. Todo en estilo HUD militar.",
    duration: 22000,
  },
  {
    href: "/forecast",
    title: "Forecast IA",
    narration: "Y por último, no solo vemos el ahora: predecimos el mañana. Esta vista proyecta los próximos siete días basándose en los patrones reales del histórico. Las anomalías predichas aparecen marcadas. Es el agente diciéndonos qué esperar.",
    duration: 24000,
  },
];

export default function TourController() {
  const router = useRouter();
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const stepStartRef = useRef<number>(0);
  const tts = useSpeechSynthesis();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function startStep(i: number) {
    if (i >= TOUR.length) {
      stopTour(true);
      return;
    }
    setStepIdx(i);
    const step = TOUR[i];
    router.push(step.href);
    setRemaining(step.duration);
    stepStartRef.current = Date.now();
    // Pequeño retraso para que la página cargue antes de narrar
    setTimeout(() => {
      if (tts.isSupported) tts.speak(step.narration);
      beep();
    }, 500);
    timerRef.current = setTimeout(() => startStep(i + 1), step.duration);
    tickRef.current = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
  }

  function startTour() {
    if (running) return;
    setRunning(true);
    setPaused(false);
    setStepIdx(0);
    boot();
    setTimeout(() => startStep(0), 400);
  }

  function stopTour(finished = false) {
    clearTimers();
    setRunning(false);
    setPaused(false);
    setStepIdx(0);
    setRemaining(0);
    tts.stop();
    if (finished) {
      launch();
      // Volver al dashboard
      setTimeout(() => router.push("/dashboard"), 400);
    }
  }

  function pause() {
    if (!running || paused) return;
    clearTimers();
    tts.pause();
    setPaused(true);
  }

  function resume() {
    if (!running || !paused) return;
    setPaused(false);
    tts.resume();
    // continuar con el tiempo restante
    timerRef.current = setTimeout(() => startStep(stepIdx + 1), remaining);
    tickRef.current = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
  }

  function next() {
    if (!running) return;
    clearTimers();
    tts.stop();
    startStep(stepIdx + 1);
  }

  // Hide en /login, /signup
  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) return null;

  useEffect(() => () => clearTimers(), []);

  if (!running) {
    return (
      <button
        className="tour-trigger"
        onClick={startTour}
        title="Iniciar tour guiado con voz"
      >
        <span>▶</span>
        <span>TOUR</span>
      </button>
    );
  }

  const current = TOUR[stepIdx];
  const progress = current ? 1 - remaining / current.duration : 0;

  return (
    <>
      <div className="tour-banner" role="status">
        <div className="tour-banner-glow" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, position: "relative", zIndex: 1 }}>
          <div className="tour-step-counter">
            <span style={{ fontSize: 10, color: "#67e8f9", letterSpacing: 2 }}>STEP</span>
            <span style={{ fontSize: 22, color: "#22d3ee", fontWeight: 700, lineHeight: 1, textShadow: "0 0 8px rgba(34,211,238,0.6)" }}>{stepIdx + 1}/{TOUR.length}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee", letterSpacing: 2, textShadow: "0 0 6px rgba(34,211,238,0.5)" }}>
              ◤ AUTOPILOT · {current?.title.toUpperCase()}
            </div>
            <div className="tour-bar"><div className="tour-bar-fill" style={{ width: `${progress * 100}%` }} /></div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {paused ? (
              <button className="tour-btn" onClick={resume} title="Reanudar">▶</button>
            ) : (
              <button className="tour-btn" onClick={pause} title="Pausar">⏸</button>
            )}
            <button className="tour-btn" onClick={next} title="Siguiente">⏭</button>
            <button className="tour-btn red" onClick={() => stopTour()} title="Detener">✕</button>
          </div>
          <div className="tour-clock">{Math.ceil(remaining / 1000)}s</div>
        </div>
      </div>

      <style jsx global>{`
        .tour-trigger {
          position: fixed; top: 14px; right: 18px; z-index: 8500;
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.15));
          border: 1px solid rgba(34,211,238,0.45);
          color: #22d3ee;
          padding: 6px 14px;
          border-radius: 18px;
          cursor: pointer;
          font-family: var(--font-mono, monospace);
          font-size: 11px; letter-spacing: 2px; font-weight: 700;
          backdrop-filter: blur(6px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.4), 0 0 16px rgba(34,211,238,0.25);
          transition: all .2s;
        }
        .tour-trigger:hover {
          background: linear-gradient(135deg, rgba(34,211,238,0.30), rgba(168,85,247,0.30));
          box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 26px rgba(34,211,238,0.5);
          transform: scale(1.05);
        }
        .tour-banner {
          position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
          z-index: 9100;
          background: linear-gradient(180deg, rgba(4,6,15,0.95), rgba(15,23,42,0.85));
          border: 1px solid rgba(34,211,238,0.5);
          border-radius: 8px;
          padding: 10px 16px;
          width: min(720px, 92vw);
          font-family: var(--font-mono, monospace);
          color: #cbd5e1;
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 30px rgba(34,211,238,0.25);
          overflow: hidden;
          animation: tourSlideIn .35s ease-out;
        }
        @keyframes tourSlideIn {
          from { opacity: 0; transform: translate(-50%, -16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .tour-banner-glow {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 50%, rgba(34,211,238,0.10), transparent 60%);
          pointer-events: none;
        }
        .tour-step-counter {
          display: flex; flex-direction: column; align-items: center;
          padding-right: 14px; border-right: 1px solid rgba(34,211,238,0.18);
        }
        .tour-bar {
          height: 4px; margin-top: 4px;
          background: rgba(34,211,238,0.10);
          border-radius: 2px; overflow: hidden;
        }
        .tour-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #a855f7);
          box-shadow: 0 0 6px #22d3ee;
          transition: width 1s linear;
        }
        .tour-btn {
          background: rgba(34,211,238,0.10);
          border: 1px solid rgba(34,211,238,0.4);
          color: #22d3ee;
          width: 30px; height: 30px;
          border-radius: 6px; cursor: pointer;
          font-size: 12px; font-family: inherit;
          transition: all .15s;
        }
        .tour-btn:hover { background: rgba(34,211,238,0.25); }
        .tour-btn.red { color: #ef4444; border-color: rgba(239,68,68,0.5); }
        .tour-btn.red:hover { background: rgba(239,68,68,0.2); }
        .tour-clock {
          font-size: 14px; font-weight: 700; color: #22d3ee;
          min-width: 38px; text-align: right;
          letter-spacing: 1px;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </>
  );
}
