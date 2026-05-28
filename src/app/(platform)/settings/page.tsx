"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlatform, ACCENT_COLORS, type AccentColor } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { ROLES } from "@/lib/roles";
import Badge from "@/components/ui/Badge";
import type { Environment } from "@/types";

type Tab = "profile" | "appearance" | "voice" | "workspace" | "shortcuts";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profile",    label: "Perfil",      icon: "👤" },
  { id: "appearance", label: "Apariencia",  icon: "🎨" },
  { id: "voice",      label: "Voz",         icon: "🎙" },
  { id: "workspace",  label: "Workspace",   icon: "🏷" },
  { id: "shortcuts",  label: "Atajos",      icon: "⌨" },
];

const ENVS: Environment[] = ["NO_INFORMADO", "DEV", "QA", "PRD", "SANDBOX"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const plat = usePlatform();
  const { user } = useAuth();
  const roleDef = ROLES.find((r) => r.id === user?.role);

  return (
    <div>
      <div className="page-title">
        <h1>⚙ Configuración</h1>
        <p>Preferencias visuales, voz y workspace de la plataforma. Cambios se aplican en vivo.</p>
      </div>

      <div className="settings-shell">
        {/* Tabs verticales */}
        <aside className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`settings-tab ${tab === t.id ? "active" : ""}`}>
              <span style={{ width: 22, textAlign: "center", fontSize: 15 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Contenido */}
        <section className="settings-content">
          {tab === "profile"    && <ProfileTab user={user} roleLabel={roleDef?.label || user?.role || "—"} />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "voice"      && <VoiceTab />}
          {tab === "workspace"  && <WorkspaceTab />}
          {tab === "shortcuts"  && <ShortcutsTab />}
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// PROFILE TAB — Identity Card holográfica estilo ops center
// ============================================================================
function ProfileTab({ user, roleLabel }: { user: ReturnType<typeof useAuth>["user"]; roleLabel: string }) {
  const [sessionUptime, setSessionUptime] = useState(0);
  const [now, setNow] = useState(new Date());

  // Reloj de uptime de sesión (segundos desde mount)
  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => {
      setSessionUptime(Math.floor((Date.now() - startedAt) / 1000));
      setNow(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!user) return <div className="card">No hay sesión activa.</div>;
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const memberSince = new Date(user.created_at);
  const days = Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / 86400000));

  // Clearance level por rol legacy
  const clearance: Record<string, { tier: number; label: string; color: string; bars: number }> = {
    admin:     { tier: 5, label: "ULTRA", color: "#f59e0b", bars: 5 },
    aprobador: { tier: 4, label: "ALTA",  color: "#a855f7", bars: 4 },
    consultor: { tier: 3, label: "MEDIA", color: "#22d3ee", bars: 3 },
    viewer:    { tier: 2, label: "BAJA",  color: "#64748b", bars: 2 },
  };
  const cl = clearance[user.role] ?? clearance.viewer;

  // Métricas sintéticas "mock" pero estables (basadas en hash del id) para que se vean realistas sin backend
  const seed = parseInt(user.id.replace(/[^a-f0-9]/gi, "").slice(0, 8), 16) || 1;
  const interactions = (seed % 950) + 50;
  const aiResolved   = 60 + (seed % 30);   // 60-89%
  const totalActions = (seed % 1200) + 200;

  // Sparkline 30 días deterministas
  const sparkData = Array.from({ length: 30 }, (_, i) => {
    const x = ((seed >> i) & 0xff) ^ (i * 11);
    return 20 + (x % 80);
  });

  // System status mock (CPU/MEM/NET) que cambia con el reloj
  const sysCPU = 18 + (Math.floor(now.getTime() / 3000) % 20);
  const sysMEM = 45 + (Math.floor(now.getTime() / 5000) % 15);
  const sysNET = 60 + (Math.floor(now.getTime() / 2000) % 30);

  function fmtUptime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* IDENTITY CARD */}
      <div className="id-card">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="id-card-scanlines" />
        <div className="id-card-grid" />

        {/* Header strip */}
        <div className="id-card-strip">
          <span style={{ color: cl.color, textShadow: `0 0 6px ${cl.color}` }}>● AUTHENTICATED</span>
          <span style={{ color: "var(--text-dim)" }}>· SESSION {fmtUptime(sessionUptime)} ·</span>
          <span style={{ color: cl.color, fontFamily: "var(--font-mono, monospace)" }}>{now.toUTCString().slice(17, 25)} UTC</span>
        </div>

        <div className="id-card-body">
          {/* Avatar holográfico con 3 rings */}
          <div className="id-avatar-frame">
            <svg width="160" height="160" viewBox="0 0 160 160" className="id-avatar-svg">
              <defs>
                <linearGradient id="id-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <radialGradient id="id-glow">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="80" cy="80" r="72" fill="url(#id-glow)" />
              <circle cx="80" cy="80" r="70" fill="none" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 6" className="id-ring id-ring-1" style={{ transformOrigin: "80px 80px" }} />
              <circle cx="80" cy="80" r="58" fill="none" stroke="#a855f7" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="8 4" className="id-ring id-ring-2" style={{ transformOrigin: "80px 80px" }} />
              <circle cx="80" cy="80" r="46" fill="none" stroke="var(--accent)" strokeOpacity="0.6" strokeWidth="1.5" className="id-ring id-ring-3" style={{ transformOrigin: "80px 80px" }} strokeDasharray="2 10" />
              {/* Centro: avatar gradient */}
              <circle cx="80" cy="80" r="40" fill="url(#id-grad)" filter="url(#id-shadow)" />
              <text x="80" y="92" textAnchor="middle" fontSize="32" fontWeight="700" fill="white" letterSpacing="-1">{initials}</text>
              {/* 4 marcas de tracking en las esquinas del avatar */}
              {[[40, 80], [120, 80], [80, 40], [80, 120]].map(([x, y], i) => (
                <g key={i}>
                  <line x1={x - 6} y1={y} x2={x - 2} y2={y} stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1={x + 2} y1={y} x2={x + 6} y2={y} stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1={x} y1={y - 6} x2={x} y2={y - 2} stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1={x} y1={y + 2} x2={x} y2={y + 6} stroke="var(--accent)" strokeWidth="1.5" />
                </g>
              ))}
            </svg>
          </div>

          {/* Info bloque central */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 2, marginBottom: 4 }}>AMS · IDENTITY CARD · v0.7</div>
            <h2 className="id-name">{user.name || user.email}</h2>
            <div className="id-email">{user.email}</div>

            <div className="id-meta-grid">
              <div className="id-meta">
                <div className="id-meta-label">DESIGNATION</div>
                <div className="id-meta-value">{roleLabel.toUpperCase()}</div>
              </div>
              <div className="id-meta">
                <div className="id-meta-label">CLEARANCE</div>
                <div className="id-meta-value" style={{ color: cl.color, textShadow: `0 0 6px ${cl.color}` }}>
                  TIER {cl.tier} · {cl.label}
                </div>
                <div className="id-bars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`id-bar ${i < cl.bars ? "on" : ""}`} style={{ ["--bar-color" as never]: cl.color }} />
                  ))}
                </div>
              </div>
              <div className="id-meta">
                <div className="id-meta-label">STATUS</div>
                <div className="id-meta-value" style={{ color: user.active ? "#10b981" : "#64748b" }}>
                  {user.active ? "● ACTIVE" : "○ INACTIVE"}
                </div>
              </div>
              <div className="id-meta">
                <div className="id-meta-label">UID</div>
                <div className="id-meta-value" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
                  {user.id.slice(0, 8)}-{user.id.slice(9, 13)}
                </div>
              </div>
            </div>
          </div>

          {/* Stats laterales (vertical) */}
          <div className="id-stats-vertical">
            <div className="id-stat-big">
              <div className="id-stat-big-num">{days}</div>
              <div className="id-stat-big-label">DÍAS</div>
            </div>
            <div className="id-stat-mini">
              <span>SES</span><b>{fmtUptime(sessionUptime).slice(3)}</b>
            </div>
            <div className="id-stat-mini">
              <span>XP</span><b>{totalActions}</b>
            </div>
          </div>
        </div>

        {/* Footer barcode */}
        <div className="id-card-barcode" aria-hidden>
          {Array.from({ length: 80 }).map((_, i) => (
            <span key={i} style={{ width: ((seed >> (i % 16)) & 3) + 1, opacity: ((seed >> i) & 1) ? 0.85 : 0.25 }} />
          ))}
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "var(--text-dim)", letterSpacing: 2 }}>
            ID-{user.id.slice(0, 12).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Telemetría + Sistema en row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* TELEMETRÍA del usuario */}
        <div className="card tech-card">
          <div className="tech-card-head">
            <span style={{ color: "var(--accent)" }}>▼</span>
            <span>USER · TELEMETRY</span>
            <span style={{ marginLeft: "auto", color: "#10b981" }}>● LIVE</span>
          </div>
          <div className="tech-rows">
            <TechRow label="INTERACTIONS · TOTAL" value={interactions.toLocaleString()} accent="var(--accent)" />
            <TechRow label="AI · RESOLVED %"      value={`${aiResolved}%`}              accent="#10b981" />
            <TechRow label="ACTIONS · LOGGED"     value={totalActions.toLocaleString()} accent="#a855f7" />
            <TechRow label="MEMBER · SINCE"       value={memberSince.toISOString().slice(0, 10)} accent="#fbbf24" mono />
            <TechRow label="LAST · LOGIN"         value="just now"                       accent="#22d3ee" />
          </div>

          {/* Sparkline */}
          <div style={{ marginTop: 14 }}>
            <div className="tech-mini-label">ACTIVITY · LAST 30 DAYS</div>
            <Sparkline data={sparkData} />
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="card tech-card">
          <div className="tech-card-head">
            <span style={{ color: "var(--accent)" }}>▼</span>
            <span>SYSTEM · STATUS</span>
            <span style={{ marginLeft: "auto", color: "#10b981", fontFamily: "var(--font-mono, monospace)", fontSize: 10.5 }}>{now.toLocaleTimeString()}</span>
          </div>

          <div className="sys-meter">
            <div className="sys-meter-label">
              <span>CPU LOAD</span><span style={{ fontFamily: "var(--font-mono, monospace)" }}>{sysCPU}%</span>
            </div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: `${sysCPU}%`, background: "linear-gradient(90deg, #22d3ee, #06b6d4)" }} /></div>
          </div>
          <div className="sys-meter">
            <div className="sys-meter-label">
              <span>MEMORY</span><span style={{ fontFamily: "var(--font-mono, monospace)" }}>{sysMEM}%</span>
            </div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: `${sysMEM}%`, background: "linear-gradient(90deg, #a855f7, #c084fc)" }} /></div>
          </div>
          <div className="sys-meter">
            <div className="sys-meter-label">
              <span>NETWORK</span><span style={{ fontFamily: "var(--font-mono, monospace)" }}>{sysNET}%</span>
            </div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: `${sysNET}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} /></div>
          </div>

          <div className="sys-grid">
            <SysCell label="UPLINK"   value="OK"     ok />
            <SysCell label="DOWNLINK" value="OK"     ok />
            <SysCell label="ENCRYPT"  value="TLS"    ok />
            <SysCell label="REGION"   value="LATAM" />
            <SysCell label="LATENCY"  value={`${28 + (sysNET % 12)}ms`} />
            <SysCell label="API VER"  value="v0.7" />
          </div>
        </div>
      </div>

      {/* Permisos en pildoras */}
      <div className="card tech-card">
        <div className="tech-card-head">
          <span style={{ color: "var(--accent)" }}>▼</span>
          <span>SESSION · CREDENTIALS</span>
        </div>
        <div className="tech-rows" style={{ fontSize: 11.5 }}>
          <TechRow label="EMAIL"       value={user.email}         mono />
          <TechRow label="ROLE · LEGACY"   value={user.role.toUpperCase()} mono />
          <TechRow label="ROLE · LABEL"    value={roleLabel}          />
          <TechRow label="UID · FULL"      value={user.id}            mono dim />
          <TechRow label="ACCOUNT · BORN"  value={memberSince.toLocaleString("es-CL")} />
        </div>
        <div className="tech-foot">
          <span>Si necesitas cambiar tu rol, contacta al administrador.</span>
          <span>Si eres admin, ve a <code style={{ color: "var(--accent)" }}>/admin</code> para gestionar usuarios y permisos.</span>
        </div>
      </div>
    </div>
  );
}

function TechRow({ label, value, accent, mono, dim }: { label: string; value: string; accent?: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="tech-row">
      <span className="tech-row-label">{label}</span>
      <span className="tech-row-value" style={{
        color: dim ? "var(--text-dim)" : (accent ?? "var(--text)"),
        fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        textShadow: accent ? `0 0 6px ${accent}55` : "none",
      }}>{value}</span>
    </div>
  );
}

function SysCell({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="sys-cell">
      <span className="sys-cell-label">{label}</span>
      <span className={`sys-cell-value ${ok ? "ok" : ""}`}>{value}</span>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const W = 280, H = 50;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${H - ((v - min) / (max - min || 1)) * H}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#spark-fill)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 4px var(--accent))" }} />
      {/* Último punto destacado */}
      <circle cx={W} cy={H - ((data[data.length - 1] - min) / (max - min || 1)) * H} r="3" fill="var(--accent)" style={{ filter: "drop-shadow(0 0 6px var(--accent))" }} />
    </svg>
  );
}

// ============================================================================
// APPEARANCE TAB
// ============================================================================
function AppearanceTab() {
  const plat = usePlatform();
  const colorKeys = Object.keys(ACCENT_COLORS) as AccentColor[];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
      <div className="col" style={{ gap: 14 }}>
        {/* Color accent */}
        <div className="card">
          <div className="settings-section-head">
            <h3>Color accent</h3>
            <span>{ACCENT_COLORS[plat.accentColor].name}</span>
          </div>
          <p className="settings-section-desc">Define el color principal de la UI. Se aplica a botones, enlaces, gradientes y bordes destacados en toda la plataforma.</p>
          <div className="color-picker">
            {colorKeys.map((k) => {
              const c = ACCENT_COLORS[k];
              return (
                <button key={k} onClick={() => plat.setAccentColor(k)}
                  className={`color-chip ${plat.accentColor === k ? "active" : ""}`}
                  style={{ ["--chip" as never]: c.hex, ["--chip-soft" as never]: c.soft }}
                  title={c.name}>
                  <span className="color-chip-dot" />
                  <span className="color-chip-name">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aurora intensity */}
        <div className="card">
          <div className="settings-section-head">
            <h3>Aurora boreal</h3>
            <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{plat.auroraIntensity}%</span>
          </div>
          <p className="settings-section-desc">Intensidad del shader WebGL de fondo. <b>0</b> apaga la aurora por completo (mejora rendimiento en equipos débiles).</p>
          <input type="range" min={0} max={100} value={plat.auroraIntensity}
            onChange={(e) => plat.setAuroraIntensity(parseInt(e.target.value, 10))}
            className="settings-slider" />
          <div className="row between" style={{ marginTop: 4, fontSize: 10.5, color: "var(--text-dim)" }}>
            <span>off</span><span>sutil</span><span>normal</span><span>intensa</span><span>extrema</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Efectos visuales</h3>
          <Toggle label="🪟 Glassmorphism" desc="Cards con blur y transparencia"
            value={plat.glassmorphismEnabled} onChange={plat.setGlassmorphismEnabled} />
          <Toggle label="🧲 Parallax 3D" desc="Las cards se inclinan siguiendo el cursor"
            value={plat.parallaxEnabled} onChange={plat.setParallaxEnabled} />
          <Toggle label="🔊 Sonidos de eventos" desc="Reproducir blip/beep al recibir notificaciones"
            value={plat.soundsEnabled} onChange={plat.setSoundsEnabled} />
          <Toggle label="🚀 Splash screen" desc="Animación de marca al primer load de la sesión"
            value={plat.splashEnabled} onChange={plat.setSplashEnabled} />
        </div>
      </div>

      {/* Live preview */}
      <aside className="settings-preview">
        <div className="settings-preview-head">Preview en vivo</div>
        <div className="settings-preview-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT_COLORS[plat.accentColor].hex}, ${ACCENT_COLORS.violet.hex})`,
              display: "grid", placeItems: "center", color: "white", fontWeight: 700,
            }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>AMS Platform</div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Vista de muestra</div>
            </div>
          </div>
          <button className="settings-preview-btn" style={{ background: `linear-gradient(135deg, ${ACCENT_COLORS[plat.accentColor].hex}, #a855f7)` }}>
            Botón primario →
          </button>
          <a className="settings-preview-link">enlace de muestra</a>
          <div className="settings-preview-stat">
            <span>SLA</span>
            <b style={{ color: ACCENT_COLORS[plat.accentColor].hex, textShadow: `0 0 8px ${ACCENT_COLORS[plat.accentColor].hex}66` }}>98%</b>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 10, textAlign: "center" }}>
            ✓ los cambios se aplican en vivo
          </div>
        </div>
      </aside>
    </div>
  );
}

// ============================================================================
// VOICE TAB
// ============================================================================
function VoiceTab() {
  const plat = usePlatform();
  const tts = useSpeechSynthesis();
  const [testText] = useState("Hola, soy el asistente de inteligencia artificial de A M S Supply Chain. Esta es una prueba de voz.");

  // Sync voiceUri si está vacío y hay voz default disponible
  useEffect(() => {
    if (!plat.voiceUri && tts.selectedVoice) {
      plat.setVoiceUri(tts.selectedVoice.voiceURI);
    }
  }, [tts.selectedVoice, plat]);

  // Filtrar voces en español primero, luego el resto
  const voicesSorted = useMemo(() => {
    const es = tts.voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
    const others = tts.voices.filter((v) => !v.lang.toLowerCase().startsWith("es"));
    return [...es, ...others];
  }, [tts.voices]);

  function handleTest() {
    tts.setRate(plat.voiceRate);
    tts.setPitch(plat.voicePitch);
    if (plat.voiceUri) tts.setVoice(plat.voiceUri);
    tts.speak(testText);
  }

  if (!tts.isSupported) {
    return (
      <div className="card">
        <h3>Voz</h3>
        <div className="alert error">Tu navegador no soporta SpeechSynthesis. Probá con Chrome, Edge o Brave en escritorio.</div>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>🗣 Voz del agente</h3>
        <p className="settings-section-desc">Cuando el agente responda en chat o por teléfono, se usa esta voz del navegador.</p>

        <Toggle label="🔊 Auto-leer respuestas" desc="Reproducir cada respuesta del agente automáticamente"
          value={plat.autoSpeak} onChange={plat.setAutoSpeak} />

        <div style={{ marginTop: 14 }}>
          <label className="settings-label">Voz instalada en tu sistema</label>
          <select value={plat.voiceUri} onChange={(e) => plat.setVoiceUri(e.target.value)}>
            <option value="">(default del navegador)</option>
            {voicesSorted.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang}) {v.localService ? "· local" : "· cloud"}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
            {voicesSorted.length} voces disponibles · {voicesSorted.filter((v) => v.lang.toLowerCase().startsWith("es")).length} en español
          </div>
        </div>

        <div className="settings-slider-block">
          <div className="row between">
            <label className="settings-label">Velocidad</label>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, color: "var(--accent)" }}>
              {plat.voiceRate.toFixed(2)}×
            </span>
          </div>
          <input type="range" min={0.5} max={2} step={0.05} value={plat.voiceRate}
            onChange={(e) => plat.setVoiceRate(parseFloat(e.target.value))}
            className="settings-slider" />
          <div className="row between" style={{ fontSize: 10, color: "var(--text-dim)" }}>
            <span>0.5×</span><span>1×</span><span>2×</span>
          </div>
        </div>

        <div className="settings-slider-block">
          <div className="row between">
            <label className="settings-label">Tono</label>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, color: "var(--accent)" }}>
              {plat.voicePitch.toFixed(2)}
            </span>
          </div>
          <input type="range" min={0} max={2} step={0.05} value={plat.voicePitch}
            onChange={(e) => plat.setVoicePitch(parseFloat(e.target.value))}
            className="settings-slider" />
          <div className="row between" style={{ fontSize: 10, color: "var(--text-dim)" }}>
            <span>grave</span><span>medio</span><span>agudo</span>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn primary" onClick={handleTest} disabled={tts.isSpeaking}>
            {tts.isSpeaking ? "🔊 hablando…" : "▶ Probar voz"}
          </button>
          {tts.isSpeaking && (
            <button className="btn ghost" onClick={tts.stop}>⏹ Detener</button>
          )}
          <button className="btn ghost" onClick={() => { plat.setVoiceRate(1); plat.setVoicePitch(1); }} style={{ marginLeft: "auto", fontSize: 11 }}>
            ↻ Reset
          </button>
        </div>

        <div style={{
          marginTop: 12, padding: 10, fontSize: 12, color: "var(--text-dim)",
          background: "rgba(255,255,255,0.02)", borderRadius: 4, borderLeft: "2px solid var(--accent)",
          fontStyle: "italic",
        }}>
          "{testText}"
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORKSPACE TAB
// ============================================================================
function WorkspaceTab() {
  const plat = usePlatform();
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>🏢 Contexto de trabajo</h3>
        <p className="settings-section-desc">Estos valores se envían al backend con cada consulta al agente AMS para enriquecer el contexto.</p>

        <div className="col" style={{ gap: 12, marginTop: 10 }}>
          <div>
            <label className="settings-label">Cliente</label>
            <input value={plat.client} onChange={(e) => plat.setClient(e.target.value)} placeholder="demo" />
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
              Identificador interno del cliente para el cual estás trabajando. Aparece en logs y reportes.
            </div>
          </div>
          <div>
            <label className="settings-label">Ambiente SAP</label>
            <select value={plat.environment} onChange={(e) => plat.setEnvironment(e.target.value as Environment)}>
              {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
              <b>PRD</b> nunca ejecuta acciones reales en SAP — el agente es solo consultivo.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>📡 Conexión backend</h3>
        <Row label="API URL" value={process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601"} mono dim />
        <Row label="Auth" value="Cookies httpOnly SameSite=Lax" />
        <Row label="Versión platform" value="v0.7 · RBAC activo" />
      </div>
    </div>
  );
}

// ============================================================================
// SHORTCUTS TAB
// ============================================================================
function ShortcutsTab() {
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const cmd = isMac ? "⌘" : "Ctrl";

  const groups: { title: string; items: { keys: string[]; desc: string }[] }[] = [
    {
      title: "Navegación",
      items: [
        { keys: [cmd, "K"], desc: "Abrir buscador / command palette" },
        { keys: ["G", "H"], desc: "Ir al dashboard (próximamente)" },
        { keys: ["G", "A"], desc: "Ir al agente AMS (próximamente)" },
        { keys: ["G", "W"], desc: "Ir al war room (próximamente)" },
      ],
    },
    {
      title: "Acciones globales",
      items: [
        { keys: ["F11"], desc: "Pantalla completa (modo wallboard / TV)" },
        { keys: ["Esc"], desc: "Cerrar modales y popovers" },
        { keys: ["Tab"], desc: "Navegar entre campos de formulario" },
      ],
    },
    {
      title: "Chat con agente",
      items: [
        { keys: [cmd, "Enter"], desc: "Enviar mensaje al agente" },
        { keys: ["Enter"], desc: "Nueva línea en el textarea" },
        { keys: ["Shift", "Enter"], desc: "Enviar (en algunos forms)" },
      ],
    },
    {
      title: "Voz",
      items: [
        { keys: ["Espacio"], desc: "Activar push-to-talk en /agent/voice (mantener pulsado)" },
        { keys: ["M"], desc: "Mute / unmute sonidos (cuando focus en player)" },
      ],
    },
  ];

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>⌨ Atajos de teclado</h3>
        <p className="settings-section-desc">
          Plataforma {isMac ? "Mac" : "Windows/Linux"} detectada. Los atajos marcados como <i>(próximamente)</i> están planeados para v0.8 con command palette completo.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.title} className="card">
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>{g.title}</div>
          {g.items.map((it, i) => (
            <div key={i} className="row between" style={{ padding: "7px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{it.desc}</div>
              <div className="row" style={{ gap: 4 }}>
                {it.keys.map((k, j) => (
                  <span key={j}>
                    {j > 0 && <span style={{ color: "var(--text-dim)", margin: "0 4px", fontSize: 11 }}>+</span>}
                    <kbd className="settings-kbd">{k}</kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
function Row({ label, value, mono, dim }: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="row between" style={{ padding: "5px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)", fontSize: 12.5 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span style={{
        color: dim ? "var(--text-dim)" : "var(--text)",
        fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        fontSize: mono ? 11.5 : undefined,
        textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</span>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="settings-toggle">
      <div className="settings-toggle-text">
        <div className="settings-toggle-label">{label}</div>
        <div className="settings-toggle-desc">{desc}</div>
      </div>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="settings-toggle-switch" />
    </label>
  );
}
