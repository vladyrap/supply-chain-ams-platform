"use client";

import { useEffect, useRef } from "react";
import { usePlatform } from "@/context/PlatformContext";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";

// Frecuencias / duraciones de los sonidos sintéticos por tipo de evento.
// Web Audio puro, sin assets externos.
const SOUND_FOR_KIND: Record<NotificationItem["kind"], { freq: number; dur: number; type: OscillatorType }> = {
  ticket_escalated:  { freq: 220, dur: 0.18, type: "sawtooth" },   // grave urgente
  ticket_resolved:   { freq: 880, dur: 0.32, type: "sine"     },   // campana alta
  kb_approved:       { freq: 660, dur: 0.18, type: "triangle" },   // notif suave
  meeting_done:      { freq: 440, dur: 0.22, type: "sine"     },   // limpio
  incident_created:  { freq: 330, dur: 0.12, type: "square"   },   // ping corto
};

const CONFETTI_KINDS: NotificationItem["kind"][] = ["ticket_resolved", "kb_approved"];
const COLORS = ["#fbbf24", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#06b6d4", "#ec4899"];

function playTone(ctx: AudioContext, freq: number, durSec: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);
  const now = ctx.currentTime;
  // Envolvente ADSR muy básica
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);
  osc.start(now);
  osc.stop(now + durSec + 0.05);
}

function spawnConfetti() {
  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;";
  document.body.appendChild(root);

  const count = 60;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = 6 + Math.random() * 8;
    const left = 30 + Math.random() * 40;     // % desde el centro
    const dx = (Math.random() - 0.5) * 60;    // viewport vw
    const rot = Math.random() * 360;
    const dur = 1.6 + Math.random() * 1.2;
    piece.style.cssText = `
      position: absolute;
      left: ${left}%; top: -20px;
      width: ${size}px; height: ${size * 0.4}px;
      background: ${c};
      transform: rotate(${rot}deg);
      animation: confettiFall ${dur}s cubic-bezier(.2,.4,.4,1) forwards;
      --dx: ${dx}vw;
    `;
    root.appendChild(piece);
  }

  setTimeout(() => root.remove(), 3500);
}

// Hook: detecta nuevas notificaciones y dispara efectos según fxEnabled
export default function EventEffects() {
  const { fxEnabled } = usePlatform();
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Crear AudioContext después de primera interacción del user (autoplay policy)
  useEffect(() => {
    if (!fxEnabled) return;
    function init() {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
    }
    window.addEventListener("click", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("click", init);
      window.removeEventListener("keydown", init);
    };
  }, [fxEnabled]);

  // Polling de notificaciones para detectar nuevas
  useEffect(() => {
    if (!fxEnabled) return;
    let alive = true;
    async function tick() {
      const r = await fetchNotifications();
      if (!alive || !r.ok) return;
      const items = r.items.slice(0, 25);
      const newOnes: NotificationItem[] = [];
      for (const it of items) {
        if (!seenIds.current.has(it.id)) {
          seenIds.current.add(it.id);
          if (!firstLoadRef.current) newOnes.push(it);
        }
      }
      firstLoadRef.current = false;

      newOnes.forEach((ev, i) => {
        const sound = SOUND_FOR_KIND[ev.kind];
        if (sound && audioCtxRef.current) {
          setTimeout(() => {
            try { playTone(audioCtxRef.current!, sound.freq, sound.dur, sound.type); } catch { /* ignore */ }
          }, i * 120);
        }
        if (CONFETTI_KINDS.includes(ev.kind)) {
          setTimeout(() => spawnConfetti(), 100 + i * 200);
        }
      });
    }
    tick();
    const t = setInterval(tick, 3500);
    return () => { alive = false; clearInterval(t); };
  }, [fxEnabled]);

  // Inject the confetti keyframes una vez
  useEffect(() => {
    if (document.getElementById("fx-keyframes")) return;
    const style = document.createElement("style");
    style.id = "fx-keyframes";
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translate(0, 0) rotate(0deg);                         opacity: 1; }
        80%  { opacity: 1; }
        100% { transform: translate(var(--dx), 100vh) rotate(720deg);          opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}
