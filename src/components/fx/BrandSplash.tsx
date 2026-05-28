"use client";

import { useEffect, useState } from "react";

// Splash de marca al primer load de la sesión.
// Aparece ~1.6s mostrando brand mark + texto + progress.
// Se persiste en sessionStorage para no repetirse al navegar.

const STORAGE_KEY = "ams-splash-seen-v1";
const DURATION = 1600;

export default function BrandSplash() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sólo primera vez por sesión del browser
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

    setVisible(true);
    sessionStorage.setItem(STORAGE_KEY, "1");

    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / DURATION);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setVisible(false), 220);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!visible) return null;

  return (
    <div className="brand-splash" aria-hidden>
      <div className="brand-splash-content">
        <svg width="140" height="140" viewBox="0 0 64 64" className="brand-splash-mark">
          <defs>
            <linearGradient id="splash-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <radialGradient id="splash-glow">
              <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#splash-glow)" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="url(#splash-grad)" strokeWidth="2"
            strokeDasharray={`${Math.PI * 52}`} strokeDashoffset={`${(1 - progress) * Math.PI * 52}`}
            style={{ transformOrigin: "32px 32px", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.05s linear" }} />
          <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" strokeDasharray="3 5"
            className="brand-splash-inner-spin" style={{ transformOrigin: "32px 32px" }} />
          <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="url(#splash-grad)" style={{ letterSpacing: "-0.05em" }}>A</text>
        </svg>

        <div className="brand-splash-text">
          <div className="brand-splash-name">AMS PLATFORM</div>
          <div className="brand-splash-tag">Initializing enterprise AI</div>
        </div>

        <div className="brand-splash-bar">
          <div className="brand-splash-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="brand-splash-pct">{Math.round(progress * 100)}%</div>
      </div>

      <style jsx>{`
        .brand-splash {
          position: fixed; inset: 0; z-index: 99999;
          background:
            radial-gradient(ellipse at center, rgba(34, 211, 238, 0.10), transparent 60%),
            #04060f;
          display: grid; place-items: center;
          animation: splashFade 0.25s ease-out reverse 1.45s forwards;
        }
        @keyframes splashFade {
          from { opacity: 1; }
          to   { opacity: 0; pointer-events: none; }
        }
        .brand-splash-content {
          display: flex; flex-direction: column; align-items: center; gap: 18px;
          animation: splashIn 0.5s ease-out;
        }
        @keyframes splashIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .brand-splash-mark {
          filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.5));
        }
        :global(.brand-splash-inner-spin) { animation: splashSpin 4s linear infinite; }
        @keyframes splashSpin {
          to { transform: rotate(360deg); }
        }
        .brand-splash-text { text-align: center; }
        .brand-splash-name {
          font-size: 22px; letter-spacing: 8px; font-weight: 700;
          color: #e2e8f0;
          text-shadow: 0 0 18px rgba(34, 211, 238, 0.4);
          font-family: var(--font-mono, "Consolas", monospace);
        }
        .brand-splash-tag {
          font-size: 11px; letter-spacing: 3px; color: #67e8f9;
          text-transform: uppercase; margin-top: 4px;
          font-family: var(--font-mono, "Consolas", monospace);
        }
        .brand-splash-bar {
          width: 260px; height: 3px;
          background: rgba(34, 211, 238, 0.12);
          border-radius: 2px; overflow: hidden;
          margin-top: 6px;
        }
        .brand-splash-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #a855f7, #f59e0b);
          box-shadow: 0 0 12px #22d3ee;
        }
        .brand-splash-pct {
          font-size: 10.5px; letter-spacing: 2px; color: #94a3b8;
          font-family: var(--font-mono, "Consolas", monospace);
        }
      `}</style>
    </div>
  );
}
