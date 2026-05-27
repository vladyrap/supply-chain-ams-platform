// Generador procedural de sonidos con Web Audio API.
// Cero assets externos, todo sintetizado en tiempo real.

let audioCtx: AudioContext | null = null;
let muted = false;

export function initAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (typeof window !== "undefined") localStorage.setItem("ams-sound-muted", m ? "1" : "0");
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("ams-sound-muted") === "1") muted = true;
  return muted;
}

function tone(opts: { freq: number; dur: number; type?: OscillatorType; gain?: number; freqEnd?: number; delay?: number }) {
  if (muted) return;
  const ctx = initAudio();
  if (!ctx) return;
  const start = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), start + opts.dur);
  }
  const peak = opts.gain ?? 0.15;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + opts.dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + opts.dur + 0.02);
}

// Click corto al hover/click
export function blip() {
  tone({ freq: 880, dur: 0.05, type: "square", gain: 0.05 });
}

// Beep clásico de notificación
export function beep() {
  tone({ freq: 1200, dur: 0.12, type: "triangle", gain: 0.10 });
}

// Radar sweep: pulso bajo con eco corto
export function radar() {
  tone({ freq: 440, dur: 0.18, type: "sine", gain: 0.10 });
  tone({ freq: 440, dur: 0.18, type: "sine", gain: 0.06, delay: 0.18 });
}

// Alert: sweep grave→agudo
export function alert() {
  tone({ freq: 200, freqEnd: 1100, dur: 0.30, type: "sawtooth", gain: 0.13 });
}

// Boot sequence: 3 tonos descendentes
export function boot() {
  tone({ freq: 880, dur: 0.10, gain: 0.10 });
  tone({ freq: 660, dur: 0.10, gain: 0.10, delay: 0.10 });
  tone({ freq: 440, dur: 0.18, gain: 0.10, delay: 0.20 });
}

// Launch: rumble bajo + sweep
export function launch() {
  tone({ freq: 60,  dur: 1.2, type: "sawtooth", gain: 0.18 });
  tone({ freq: 200, freqEnd: 1200, dur: 0.8, type: "square", gain: 0.10, delay: 0.2 });
}

// Mapping por kind de notificación
export const SOUND_BY_KIND: Record<string, () => void> = {
  incident_created: radar,
  ticket_escalated: alert,
  ticket_resolved:  beep,
  kb_approved:      blip,
  meeting_done:     beep,
};
