"use client";

import { useEffect, useState } from "react";

// Showcase lateral usado por /login y /signup.
// Rotates 3 features cada 5s con fade cruzado. Background con aurora intensa.

const FEATURES = [
  {
    icon: "🤖",
    title: "Asistente IA con voz",
    body: "Atiende llamadas telefonicas vía Twilio Voice, chat por web y eventos en vivo. Mesa de soporte con escalacion automatica a Nivel 2.",
    accent: "#4589ff",
  },
  {
    icon: "🌐",
    title: "War room 3D en vivo",
    body: "Globo terraqueo Three.js con tus clientes geolocalizados. Cada incidente real dispara un arco animado. Aurora boreal de fondo global.",
    accent: "#a855f7",
  },
  {
    icon: "🔮",
    title: "Forecast de operaciones",
    body: "Proyeccion 7 dias con regresion lineal sobre tu historico. Banda de confianza 95%, anomalias detectadas y top 3 next-likely incidents.",
    accent: "#f1c21b",
  },
];

export default function AuthShowcase() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % FEATURES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const f = FEATURES[idx];

  return (
    <aside className="auth-showcase">
      {/* Brand mark grande */}
      <div className="auth-brand">
        <svg width="64" height="64" viewBox="0 0 64 64" className="auth-brand-mark">
          <defs>
            <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#4589ff" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <radialGradient id="brand-glow">
              <stop offset="0%" stopColor="rgba(69,137,255,0.6)" />
              <stop offset="100%" stopColor="rgba(69,137,255,0)" />
            </radialGradient>
          </defs>
          {/* Glow trasero */}
          <circle cx="32" cy="32" r="30" fill="url(#brand-glow)" />
          {/* Anillo exterior */}
          <circle cx="32" cy="32" r="26" fill="none" stroke="url(#brand-grad)" strokeWidth="2" strokeDasharray="6 4" className="brand-spin-slow" style={{ transformOrigin: "32px 32px" }} />
          {/* Anillo interno */}
          <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" strokeDasharray="3 5" className="brand-spin-fast" style={{ transformOrigin: "32px 32px" }} />
          {/* "A" central */}
          <text x="32" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="url(#brand-grad)" style={{ letterSpacing: "-0.05em" }}>A</text>
        </svg>
        <div>
          <div className="auth-brand-name">AMS PLATFORM</div>
          <div className="auth-brand-tag">Enterprise AI for SAP Supply Chain</div>
        </div>
      </div>

      {/* Display headline */}
      <div className="auth-headline">
        <h2>
          <span className="auth-grad-text">Tu mesa de soporte</span><br />
          <span>SAP, con IA</span><br />
          <span style={{ color: "#5b6b7d", fontWeight: 300 }}>en tiempo real.</span>
        </h2>
      </div>

      {/* Feature rotativo */}
      <div className="auth-feature-stage">
        {FEATURES.map((feat, i) => (
          <div
            key={feat.title}
            className={`auth-feature ${i === idx ? "active" : ""}`}
            style={{ ["--feat-color" as never]: feat.accent }}
          >
            <div className="auth-feature-icon">{feat.icon}</div>
            <div>
              <div className="auth-feature-title">{feat.title}</div>
              <div className="auth-feature-body">{feat.body}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="auth-dots">
        {FEATURES.map((_, i) => (
          <button
            key={i}
            className={`auth-dot ${i === idx ? "active" : ""}`}
            onClick={() => setIdx(i)}
            aria-label={`feature ${i + 1}`}
          />
        ))}
      </div>

      {/* Stats footer */}
      <div className="auth-stats">
        <div className="auth-stat"><b>23</b><span>módulos</span></div>
        <div className="auth-stat"><b>3</b><span>canales (chat/voz/tel)</span></div>
        <div className="auth-stat"><b>13</b><span>contenedores stack</span></div>
      </div>
    </aside>
  );
}
