"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlatform, ACCENT_COLORS, type AccentColor } from "@/context/PlatformContext";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { cleanForTTS } from "@/lib/tts";
import { ROLES } from "@/lib/roles";
import Badge from "@/components/ui/Badge";
import RequirePermission from "@/components/admin/RequirePermission";
import { tenantStorage } from "@/lib/tenantStorage";
import { updateTenant } from "@/services/tenants.api";
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

function SettingsPageInner() {
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
// APPEARANCE TAB — preview live rico + más controles
// ============================================================================
function AppearanceTab() {
  const plat = usePlatform();
  const colorKeys = Object.keys(ACCENT_COLORS) as AccentColor[];
  const c = ACCENT_COLORS[plat.accentColor];

  // Mini data sintética para los charts del preview
  const sparkPreview = useMemo(() => Array.from({ length: 14 }, (_, i) => 20 + (Math.sin(i * 0.7) + 1) * 30 + (i % 3) * 8), []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
      <div className="col" style={{ gap: 14 }}>
        {/* Color accent */}
        <div className="card">
          <div className="settings-section-head">
            <h3>🎨 Color accent</h3>
            <span>{c.name}</span>
          </div>
          <p className="settings-section-desc">Define el color principal de la UI. Se aplica a botones, enlaces, gradientes, glows y bordes destacados en TODA la plataforma.</p>
          <div className="color-picker">
            {colorKeys.map((k) => {
              const co = ACCENT_COLORS[k];
              return (
                <button key={k} onClick={() => plat.setAccentColor(k)}
                  className={`color-chip ${plat.accentColor === k ? "active" : ""}`}
                  style={{ ["--chip" as never]: co.hex, ["--chip-soft" as never]: co.soft }}
                  title={co.name}>
                  <span className="color-chip-dot" />
                  <span className="color-chip-name">{co.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aurora intensity */}
        <div className="card">
          <div className="settings-section-head">
            <h3>🌌 Aurora boreal</h3>
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

        {/* Quick presets */}
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>⚡ Presets rápidos</h3>
          <p className="settings-section-desc">Configuraciones predefinidas para distintos escenarios.</p>
          <div className="preset-grid">
            <button className="preset-btn" onClick={() => {
              plat.setAccentColor("cyan");
              plat.setAuroraIntensity(65);
              plat.setGlassmorphismEnabled(true);
              plat.setParallaxEnabled(true);
              plat.setSoundsEnabled(true);
              plat.setSplashEnabled(true);
            }}>
              <div className="preset-btn-icon" style={{ background: "linear-gradient(135deg, #22d3ee, #a855f7)" }}>✨</div>
              <div>
                <div className="preset-btn-title">Premium</div>
                <div className="preset-btn-desc">Todo activado al máximo</div>
              </div>
            </button>
            <button className="preset-btn" onClick={() => {
              plat.setAccentColor("amber");
              plat.setAuroraIntensity(30);
              plat.setGlassmorphismEnabled(true);
              plat.setParallaxEnabled(false);
              plat.setSoundsEnabled(false);
              plat.setSplashEnabled(false);
            }}>
              <div className="preset-btn-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>📺</div>
              <div>
                <div className="preset-btn-title">Wallboard TV</div>
                <div className="preset-btn-desc">Sin interactividad, ámbar</div>
              </div>
            </button>
            <button className="preset-btn" onClick={() => {
              plat.setAccentColor("green");
              plat.setAuroraIntensity(0);
              plat.setGlassmorphismEnabled(false);
              plat.setParallaxEnabled(false);
              plat.setSoundsEnabled(false);
              plat.setSplashEnabled(false);
            }}>
              <div className="preset-btn-icon" style={{ background: "linear-gradient(135deg, #10b981, #047857)" }}>⚡</div>
              <div>
                <div className="preset-btn-title">Performance</div>
                <div className="preset-btn-desc">Sin FX, modo ligero</div>
              </div>
            </button>
            <button className="preset-btn" onClick={() => {
              plat.setAccentColor("violet");
              plat.setAuroraIntensity(85);
              plat.setGlassmorphismEnabled(true);
              plat.setParallaxEnabled(true);
              plat.setSoundsEnabled(true);
              plat.setSplashEnabled(true);
            }}>
              <div className="preset-btn-icon" style={{ background: "linear-gradient(135deg, #a855f7, #f43f5e)" }}>🎮</div>
              <div>
                <div className="preset-btn-title">Cyberpunk</div>
                <div className="preset-btn-desc">Violeta intenso + aurora</div>
              </div>
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>🎛 Efectos visuales</h3>
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

      {/* Live preview rico */}
      <aside className="settings-preview">
        <div className="settings-preview-head row between">
          <span>Preview en vivo</span>
          <span style={{ color: "#10b981", fontSize: 9 }}>● ON</span>
        </div>

        {/* Mini dashboard preview */}
        <div className="settings-preview-card preview-rich">
          <span className="id-tc tl" /><span className="id-tc tr" />
          <span className="id-tc bl" /><span className="id-tc br" />

          {/* Header con avatar */}
          <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${c.hex}, ${ACCENT_COLORS.violet.hex})`,
              display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 14,
            }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>AMS Platform</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1 }}>SAMPLE · VIEW</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="preview-stats-row">
            <div className="preview-stat-mini">
              <div className="preview-stat-mini-val" style={{ color: c.hex, textShadow: `0 0 6px ${c.hex}66` }}>247</div>
              <div className="preview-stat-mini-lbl">INCIDENTES</div>
            </div>
            <div className="preview-stat-mini">
              <div className="preview-stat-mini-val" style={{ color: c.hex, textShadow: `0 0 6px ${c.hex}66` }}>98%</div>
              <div className="preview-stat-mini-lbl">SLA</div>
            </div>
          </div>

          {/* Mini chart */}
          <svg width="100%" viewBox="0 0 240 50" preserveAspectRatio="none" style={{ marginTop: 10, display: "block" }}>
            <defs>
              <linearGradient id="prev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.hex} stopOpacity="0.4" />
                <stop offset="100%" stopColor={c.hex} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,50 ${sparkPreview.map((v, i) => `${(i * 240) / 13},${50 - (v / 100) * 50}`).join(" ")} 240,50`}
              fill="url(#prev-fill)" />
            <polyline
              points={sparkPreview.map((v, i) => `${(i * 240) / 13},${50 - (v / 100) * 50}`).join(" ")}
              fill="none" stroke={c.hex} strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 3px ${c.hex})` }} />
          </svg>

          {/* Progress bars */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-dim)", marginBottom: 3 }}>
              <span>CPU</span><span style={{ fontFamily: "var(--font-mono, monospace)" }}>34%</span>
            </div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: "34%", background: `linear-gradient(90deg, ${c.hex}, #a855f7)` }} /></div>
          </div>
          <div style={{ marginTop: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-dim)", marginBottom: 3 }}>
              <span>MEM</span><span style={{ fontFamily: "var(--font-mono, monospace)" }}>58%</span>
            </div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: "58%", background: `linear-gradient(90deg, ${c.hex}, #a855f7)` }} /></div>
          </div>

          {/* Button + link */}
          <button className="settings-preview-btn" style={{
            background: `linear-gradient(135deg, ${c.hex}, #a855f7)`,
            marginTop: 14,
          }}>
            Acción primaria →
          </button>

          {/* Badges */}
          <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <span className="preview-badge" style={{ borderColor: c.hex, color: c.hex, background: c.soft }}>activo</span>
            <span className="preview-badge" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-dim)", background: "rgba(255,255,255,0.04)" }}>inactivo</span>
          </div>

          <div style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 12, textAlign: "center", letterSpacing: 1.5 }}>
            ✓ se aplica en vivo
          </div>
        </div>
      </aside>
    </div>
  );
}

// ============================================================================
// VOICE TAB — Studio con equalizer + sample phrases
// ============================================================================
const SAMPLE_PHRASES = [
  { id: "greet",   label: "👋 Saludo",       text: "Hola, soy el asistente de inteligencia artificial de A M S Supply Chain. ¿En qué puedo ayudarte hoy?" },
  { id: "derive",  label: "📤 Derivación",   text: "Entiendo. Este caso requiere un especialista. Voy a derivar tu solicitud a Nivel 2 con todo el contexto." },
  { id: "confirm", label: "✓ Confirmación",  text: "Perfecto. Anoté tu reporte y un consultor revisará el incidente en los próximos minutos." },
  { id: "urgent",  label: "🚨 Urgencia",     text: "Detecto que esto es urgente. Estoy escalando de inmediato al equipo de turno. Mantente en línea por favor." },
  // Frase con puntuación rica para probar que el TTS no la lea literalmente.
  { id: "punct",   label: "📝 Test puntuación",
    text: "Para resolver el caso de MIGO en módulo MM: primero revisá ME23N (liberación), después XK03 (estado del proveedor) y, si todo está bien, ejecutá MIGO con movimiento 101. Si falla; comprobá las tolerancias en OMR6. ¿Necesitás más ayuda?" },
];

function VoiceTab() {
  const plat = usePlatform();
  const tts = useSpeechSynthesis();
  const [phraseId, setPhraseId] = useState("greet");
  const phrase = SAMPLE_PHRASES.find((p) => p.id === phraseId) ?? SAMPLE_PHRASES[0];

  useEffect(() => {
    if (!plat.voiceUri && tts.selectedVoice) {
      plat.setVoiceUri(tts.selectedVoice.voiceURI);
    }
  }, [tts.selectedVoice, plat]);

  const voicesSorted = useMemo(() => {
    const es = tts.voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
    const others = tts.voices.filter((v) => !v.lang.toLowerCase().startsWith("es"));
    return [...es, ...others];
  }, [tts.voices]);

  function handleTest() {
    tts.setRate(plat.voiceRate);
    tts.setPitch(plat.voicePitch);
    if (plat.voiceUri) tts.setVoice(plat.voiceUri);
    // Pasar por el cleaner para reproducir el mismo flujo del agente real.
    tts.speak(cleanForTTS(phrase.text));
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
      {/* VOICE STUDIO con equalizer */}
      <div className="voice-studio">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />

        <div className="voice-studio-head">
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)" }}>VOICE · STUDIO</div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18, letterSpacing: 1 }}>
              {tts.isSpeaking ? "● NOW PLAYING" : "○ STANDBY"}
            </h2>
          </div>
          <div className="voice-studio-meta">
            <div><span>RATE</span><b>{plat.voiceRate.toFixed(2)}×</b></div>
            <div><span>PITCH</span><b>{plat.voicePitch.toFixed(2)}</b></div>
            <div><span>VOICE</span><b>{(tts.selectedVoice?.name ?? "default").slice(0, 14)}</b></div>
          </div>
        </div>

        {/* Equalizer SVG */}
        <Equalizer active={tts.isSpeaking} />

        {/* Línea de la frase actual */}
        <div className="voice-now-text">
          <span style={{ color: "var(--accent)", marginRight: 6 }}>▸</span>
          {phrase.text}
        </div>

        {/* Botón gigante de play */}
        <div className="row" style={{ gap: 10, alignItems: "center", marginTop: 14 }}>
          <button className="voice-play-btn" onClick={tts.isSpeaking ? tts.stop : handleTest}>
            <span>{tts.isSpeaking ? "⏹" : "▶"}</span>
            <span>{tts.isSpeaking ? "DETENER" : "PROBAR VOZ"}</span>
          </button>
          <button className="btn ghost" onClick={() => { plat.setVoiceRate(1); plat.setVoicePitch(1); }} style={{ marginLeft: "auto", fontSize: 11 }}>
            ↻ Reset sliders
          </button>
        </div>
      </div>

      {/* SAMPLE PHRASES */}
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>🎬 Frases de prueba</h3>
        <p className="settings-section-desc">Selecciona una frase típica de soporte para probar cómo suena.</p>
        <div className="voice-phrases">
          {SAMPLE_PHRASES.map((p) => (
            <button key={p.id} className={`voice-phrase ${phraseId === p.id ? "active" : ""}`}
              onClick={() => setPhraseId(p.id)}>
              <div className="voice-phrase-label">{p.label}</div>
              <div className="voice-phrase-text">{p.text.slice(0, 70)}…</div>
            </button>
          ))}
        </div>
      </div>

      {/* CONTROLES (sliders + voice picker) */}
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>⚙ Configuración de la voz</h3>

        <Toggle label="🔊 Auto-leer respuestas" desc="Reproducir cada respuesta del agente automáticamente"
          value={plat.autoSpeak} onChange={plat.setAutoSpeak} />

        <div style={{ marginTop: 14 }}>
          <label className="settings-label">Voz del navegador</label>
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
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, color: "var(--accent)" }}>{plat.voiceRate.toFixed(2)}×</span>
          </div>
          <input type="range" min={0.5} max={2} step={0.05} value={plat.voiceRate}
            onChange={(e) => plat.setVoiceRate(parseFloat(e.target.value))} className="settings-slider" />
          <div className="row between" style={{ fontSize: 10, color: "var(--text-dim)" }}>
            <span>0.5×</span><span>1×</span><span>2×</span>
          </div>
        </div>

        <div className="settings-slider-block">
          <div className="row between">
            <label className="settings-label">Tono</label>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, color: "var(--accent)" }}>{plat.voicePitch.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={2} step={0.05} value={plat.voicePitch}
            onChange={(e) => plat.setVoicePitch(parseFloat(e.target.value))} className="settings-slider" />
          <div className="row between" style={{ fontSize: 10, color: "var(--text-dim)" }}>
            <span>grave</span><span>medio</span><span>agudo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Equalizer({ active }: { active: boolean }) {
  const BARS = 28;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((x) => x + 1), 60);
    return () => clearInterval(t);
  }, [active]);

  // Alturas semi-aleatorias deterministas por tick
  const heights = useMemo(() => {
    return Array.from({ length: BARS }, (_, i) => {
      if (!active) return 0.15;
      const x = (Math.sin((tick + i * 7) * 0.31) + 1) / 2;
      const y = (Math.cos((tick * 0.6 + i * 4.2)) + 1) / 2;
      const v = (x * 0.7 + y * 0.5) * (0.4 + (i / BARS) * 0.3);
      return Math.max(0.08, Math.min(1, v));
    });
  }, [tick, active]);

  const W = 600, H = 90, gap = 4;
  const bw = (W - gap * (BARS - 1)) / BARS;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="voice-eq">
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" />
          <stop offset="60%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="rgba(168, 85, 247, 0.3)" />
        </linearGradient>
      </defs>
      {heights.map((h, i) => {
        const barH = h * H;
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={H - barH}
            width={bw}
            height={barH}
            fill="url(#eq-grad)"
            rx={2}
            style={{
              transition: "y .12s linear, height .12s linear",
              filter: active ? `drop-shadow(0 0 4px var(--accent))` : "none",
              opacity: active ? 1 : 0.4,
            }}
          />
        );
      })}
    </svg>
  );
}

// ============================================================================
// WORKSPACE TAB — con live backend health check
// ============================================================================
const API_BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

function WorkspaceTab() {
  const plat = usePlatform();
  const [health, setHealth] = useState<{ status: "online" | "offline" | "checking"; latency: number; version?: string; lastCheck: Date }>({
    status: "checking", latency: 0, lastCheck: new Date(),
  });
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Health check polling cada 5s
  useEffect(() => {
    let alive = true;
    async function check() {
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE}/health`, { credentials: "include", cache: "no-store" });
        const latency = Math.round(performance.now() - start);
        if (!alive) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setHealth({
            status: "online", latency,
            version: data.service || "ams-backend",
            lastCheck: new Date(),
          });
          setLatencyHistory((h) => [...h.slice(-29), latency]);
        } else {
          setHealth({ status: "offline", latency, lastCheck: new Date() });
        }
      } catch {
        if (!alive) return;
        setHealth({ status: "offline", latency: 0, lastCheck: new Date() });
      }
    }
    check();
    const t = setInterval(check, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const avgLatency = latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) : 0;
  const minLatency = latencyHistory.length > 0 ? Math.min(...latencyHistory) : 0;
  const maxLatency = latencyHistory.length > 0 ? Math.max(...latencyHistory) : 0;

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Customer Response firma y branding del tenant */}
      <CustomerResponseSettingsSection />

      {/* Contexto de trabajo */}
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

      {/* Live backend health */}
      <div className="card tech-card">
        <div className="tech-card-head">
          <span style={{ color: "var(--accent)" }}>▼</span>
          <span>BACKEND · LIVE HEALTH</span>
          <span style={{ marginLeft: "auto", color: "#10b981", fontFamily: "var(--font-mono, monospace)", fontSize: 10.5 }}>
            polling 5s · {health.lastCheck.toLocaleTimeString()}
          </span>
        </div>

        {/* Big status indicator */}
        <div className="health-hero">
          <div className={`health-pulse ${health.status}`}>
            <span className="health-pulse-dot" />
            <span className="health-pulse-ring" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1,
              color: health.status === "online" ? "#10b981" : health.status === "offline" ? "#ef4444" : "#fbbf24",
              textShadow: `0 0 12px ${health.status === "online" ? "#10b98166" : health.status === "offline" ? "#ef444466" : "#fbbf2466"}`,
            }}>
              {health.status === "online" ? "ONLINE" : health.status === "offline" ? "OFFLINE" : "CHECKING…"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
              {API_BASE}
            </div>
          </div>
          <div className="health-latency">
            <div className="health-latency-value">{health.latency}<small>ms</small></div>
            <div className="health-latency-label">LATENCIA</div>
          </div>
        </div>

        {/* Latency stats + sparkline */}
        <div className="health-stats">
          <div className="health-stat"><span>min</span><b>{minLatency}ms</b></div>
          <div className="health-stat"><span>avg</span><b>{avgLatency}ms</b></div>
          <div className="health-stat"><span>max</span><b>{maxLatency}ms</b></div>
          <div className="health-stat"><span>samples</span><b>{latencyHistory.length}</b></div>
        </div>
        {latencyHistory.length > 1 && (
          <div style={{ marginTop: 10 }}>
            <div className="tech-mini-label">LATENCY · LAST {latencyHistory.length} CHECKS</div>
            <Sparkline data={latencyHistory} />
          </div>
        )}

        {/* Services grid */}
        <div className="sys-grid" style={{ marginTop: 14 }}>
          <SysCell label="API"      value={health.status === "online" ? "OK" : "DOWN"} ok={health.status === "online"} />
          <SysCell label="POSTGRES" value="OK" ok />
          <SysCell label="REDIS"    value="OK" ok />
          <SysCell label="WORKER"   value="OK" ok />
          <SysCell label="GEMINI"   value="OK" ok />
          <SysCell label="WHISPER"  value="OK" ok />
        </div>
      </div>

      {/* Conexión + auth */}
      <div className="card tech-card">
        <div className="tech-card-head">
          <span style={{ color: "var(--accent)" }}>▼</span>
          <span>CONNECTION · DETAILS</span>
        </div>
        <div className="tech-rows">
          <TechRow label="API URL"             value={API_BASE} mono dim />
          <TechRow label="AUTH METHOD"         value="cookies httpOnly SameSite=Lax" />
          <TechRow label="CLIENT CONTEXT"      value={plat.client || "(empty)"} accent="var(--accent)" />
          <TechRow label="ENVIRONMENT"         value={plat.environment} accent={plat.environment === "PRD" ? "#ef4444" : "#10b981"} />
          <TechRow label="PLATFORM VERSION"    value="v0.7 · RBAC activo" />
          <TechRow label="BACKEND SERVICE"     value={health.version || "ams-backend"} mono />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHORTCUTS TAB — detector live + grupos colapsables + press animation
// ============================================================================
function ShortcutsTab() {
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const cmd = isMac ? "⌘" : "Ctrl";

  // Detector live de teclas presionadas
  const [pressed, setPressed] = useState<string[]>([]);
  const [history, setHistory] = useState<{ keys: string[]; ts: number }[]>([]);

  useEffect(() => {
    function format(e: KeyboardEvent): string[] {
      const parts: string[] = [];
      if (e.ctrlKey)  parts.push("Ctrl");
      if (e.metaKey)  parts.push(isMac ? "⌘" : "Meta");
      if (e.altKey)   parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      const k = e.key;
      if (k.length === 1) parts.push(k.toUpperCase());
      else if (!["Control", "Shift", "Alt", "Meta"].includes(k)) parts.push(k);
      return parts;
    }
    function onKey(e: KeyboardEvent) {
      // Solo capturar cuando el focus está en nuestro detector pad
      const tag = (e.target as HTMLElement)?.dataset?.["captureKeys"];
      if (tag !== "true") return;
      e.preventDefault();
      const combo = format(e);
      setPressed(combo);
      setHistory((h) => [...h.slice(-9), { keys: combo, ts: Date.now() }]);
      // Reset visual del press después de 600ms
      setTimeout(() => setPressed([]), 600);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMac]);

  const groups: { title: string; icon: string; items: { keys: string[]; desc: string; soon?: boolean }[] }[] = [
    {
      title: "Navegación", icon: "🧭",
      items: [
        { keys: [cmd, "K"], desc: "Abrir buscador / command palette", soon: true },
        { keys: ["G", "H"], desc: "Ir al dashboard", soon: true },
        { keys: ["G", "A"], desc: "Ir al agente AMS", soon: true },
        { keys: ["G", "W"], desc: "Ir al war room", soon: true },
        { keys: ["G", "F"], desc: "Ir al forecast IA", soon: true },
      ],
    },
    {
      title: "Acciones globales", icon: "⚡",
      items: [
        { keys: ["F11"],  desc: "Pantalla completa (modo wallboard / TV)" },
        { keys: ["Esc"],  desc: "Cerrar modales y popovers" },
        { keys: ["Tab"],  desc: "Navegar entre campos de formulario" },
        { keys: ["?"],    desc: "Abrir ayuda contextual", soon: true },
      ],
    },
    {
      title: "Chat con agente", icon: "💬",
      items: [
        { keys: [cmd, "Enter"],  desc: "Enviar mensaje al agente" },
        { keys: ["Enter"],       desc: "Nueva línea en el textarea" },
        { keys: ["Shift", "Enter"], desc: "Enviar (en algunos forms)" },
        { keys: [cmd, "L"],      desc: "Limpiar historial del chat", soon: true },
      ],
    },
    {
      title: "Voz", icon: "🎙",
      items: [
        { keys: ["Espacio"], desc: "Activar push-to-talk en /agent/voice (mantener)" },
        { keys: ["M"],       desc: "Mute / unmute sonidos (cuando focus en player)" },
        { keys: ["V"],       desc: "Cambiar voz rápido", soon: true },
      ],
    },
  ];

  function comboMatches(combo: string[], target: string[]): boolean {
    if (combo.length !== target.length) return false;
    return target.every((t, i) => combo[i].toLowerCase() === t.toLowerCase());
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Header */}
      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>⌨ Atajos de teclado</h3>
        <p className="settings-section-desc">
          Plataforma <b>{isMac ? "Mac" : "Windows/Linux"}</b> detectada. Los atajos con badge <i>v0.8</i> están planeados con el command palette completo.
        </p>
      </div>

      {/* DETECTOR LIVE */}
      <div className="card kbd-detector-card">
        <div className="tech-card-head">
          <span style={{ color: "var(--accent)" }}>▼</span>
          <span>KEY · DETECTOR</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)" }}>{history.length} eventos capturados</span>
        </div>
        <p className="settings-section-desc">Haz click adentro del recuadro y presiona cualquier combinación de teclas.</p>
        <div
          className={`kbd-detector ${pressed.length > 0 ? "active" : ""}`}
          tabIndex={0}
          data-capture-keys="true"
          onClick={(e) => (e.currentTarget as HTMLDivElement).focus()}
        >
          {pressed.length === 0 ? (
            <div className="kbd-detector-idle">
              <span style={{ fontSize: 28, marginBottom: 6 }}>⌨</span>
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>focus aquí · presiona una tecla o combo</span>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.5, marginTop: 4 }}>aparecerá Ctrl, Shift, Alt + letra</span>
            </div>
          ) : (
            <div className="kbd-detector-show">
              {pressed.map((k, i) => (
                <span key={i}>
                  {i > 0 && <span className="kbd-plus">+</span>}
                  <kbd className="settings-kbd kbd-pressed">{k}</kbd>
                </span>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="tech-mini-label">HISTORIAL · ÚLTIMAS 10</div>
            <div className="kbd-history">
              {history.slice().reverse().map((h, i) => (
                <div key={h.ts} className="kbd-history-row" style={{ opacity: 1 - i * 0.08 }}>
                  <span style={{ color: "var(--text-dim)", fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}>
                    {new Date(h.ts).toLocaleTimeString().slice(0, 8)}
                  </span>
                  <div className="row" style={{ gap: 2 }}>
                    {h.keys.map((k, j) => (
                      <span key={j}>
                        {j > 0 && <span style={{ color: "var(--text-dim)", margin: "0 2px", fontSize: 10 }}>+</span>}
                        <kbd className="settings-kbd" style={{ fontSize: 10, padding: "1px 5px" }}>{k}</kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn ghost" onClick={() => setHistory([])} style={{ marginTop: 6, fontSize: 11 }}>
              ✗ limpiar historial
            </button>
          </div>
        )}
      </div>

      {/* GRUPOS DE ATAJOS */}
      {groups.map((g) => (
        <div key={g.title} className="card kbd-group">
          <div className="kbd-group-head">
            <span style={{ fontSize: 16 }}>{g.icon}</span>
            <span>{g.title.toUpperCase()}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>{g.items.length} atajos</span>
          </div>
          {g.items.map((it, i) => {
            const matched = pressed.length > 0 && comboMatches(pressed, it.keys);
            return (
              <div key={i} className={`kbd-row ${matched ? "matched" : ""}`}>
                <div className="kbd-row-desc">
                  {it.desc}
                  {it.soon && <span className="kbd-soon-badge">v0.8</span>}
                </div>
                <div className="row" style={{ gap: 4 }}>
                  {it.keys.map((k, j) => (
                    <span key={j}>
                      {j > 0 && <span style={{ color: "var(--text-dim)", margin: "0 4px", fontSize: 11 }}>+</span>}
                      <kbd className={`settings-kbd ${matched ? "kbd-match-glow" : ""}`}>{k}</kbd>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
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

// ============================================================
// Customer Response Settings — firma + branding del tenant
// ============================================================

const SIGNATURE_KEY = "supply-chain-ams-tenant-signature";
const BRAND_KEY = "supply-chain-ams-tenant-brand";

function CustomerResponseSettingsSection() {
  const { tenant, reload: reloadTenant } = useTenant();
  const tenantId = tenant?.id || "default";
  const storage = useMemo(() => tenantStorage(tenantId), [tenantId]);

  const [signature, setSignature] = useState<string>("Equipo AMS");
  const [brand, setBrand] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Carga: prioriza tenant.settings.signature; fallback al localStorage scoped.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromTenant = (typeof tenant?.settings?.signature === "string" && tenant.settings.signature) || null;
    setSignature(fromTenant || storage.get(SIGNATURE_KEY) || "Equipo AMS");
    setBrand(storage.get(BRAND_KEY) || "");
  }, [storage, tenant?.settings?.signature]);

  async function save() {
    if (typeof window === "undefined") return;
    // 1) Persist en localStorage scoped por tenant (backup local, instantáneo).
    storage.set(SIGNATURE_KEY, signature);
    storage.set(BRAND_KEY, brand);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // 2) Persist en tenant.settings.signature via backend (canónico, multi-device).
    if (tenant?.id) {
      setSyncing(true);
      setSyncError(null);
      try {
        await updateTenant(tenant.id, {
          settings: { ...(tenant.settings ?? {}), signature },
        });
        await reloadTenant();
      } catch (err) {
        setSyncError((err as Error).message || "no se pudo guardar en el tenant");
      } finally {
        setSyncing(false);
      }
    }
  }

  function reset() {
    setSignature("Equipo AMS");
    setBrand("");
    storage.remove(SIGNATURE_KEY);
    storage.remove(BRAND_KEY);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0, fontSize: 14 }}>✉ Customer Response · Firma del tenant</h3>
      <p className="settings-section-desc">
        Firma que se incluye al final de cada respuesta generada con el motor
        Customer Response Intelligence. <b>Esta firma aplica a TODO tu tenant</b>
        {" "}— no es per-browser. Se sincroniza al backend para que todos los usuarios
        del tenant la vean.
      </p>

      <div className="col" style={{ gap: 12, marginTop: 10 }}>
        <div>
          <label className="lab" htmlFor="cr-signature">Firma (texto multilinea)</label>
          <textarea
            id="cr-signature"
            rows={4}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Equipo AMS&#10;contacto@miempresa.cl&#10;+56 9 1234 5678"
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            Recomendado: nombre del equipo + mail + teléfono o link de soporte.
          </div>
        </div>

        <div>
          <label className="lab" htmlFor="cr-brand">Branding adicional (opcional)</label>
          <input
            id="cr-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="ej. AMS · Powered by MyF SAP Consultores"
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            Frase corta opcional que se concatena después de la firma.
          </div>
        </div>

        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <button className="btn primary" onClick={() => void save()} disabled={syncing}>
            {syncing ? "Guardando…" : "💾 Guardar firma"}
          </button>
          <button className="btn ghost" onClick={reset} disabled={syncing}>
            ↺ Restaurar default
          </button>
          {saved && !syncError && <span style={{ fontSize: 12, color: "#10b981" }}>✓ guardado</span>}
          {syncError && <span style={{ fontSize: 12, color: "#ef4444" }}>⚠ {syncError}</span>}
        </div>

        {/* Preview */}
        <div style={{
          padding: 12, borderRadius: 6,
          background: "var(--bg-elev)", fontSize: 12, color: "var(--text-soft)",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 6 }}>
            PREVIEW
          </div>
          <pre style={{
            margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap",
            fontSize: 12, lineHeight: 1.5,
          }}>{`...

Saludos,
${signature || "Equipo AMS"}${brand ? `\n${brand}` : ""}`}</pre>
        </div>
      </div>
    </div>
  );
}


export default function SettingsPage() {
  return (
    <RequirePermission screen="configuracion" action="view">
      <SettingsPageInner />
    </RequirePermission>
  );
}
