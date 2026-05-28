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
// PROFILE TAB
// ============================================================================
function ProfileTab({ user, roleLabel }: { user: ReturnType<typeof useAuth>["user"]; roleLabel: string }) {
  if (!user) return <div className="card">No hay sesión activa.</div>;
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const memberSince = new Date(user.created_at);
  const days = Math.max(1, Math.floor((Date.now() - memberSince.getTime()) / 86400000));

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card profile-hero">
        <div className="profile-avatar">
          {initials}
          <span className="profile-avatar-ring" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: -0.5 }}>{user.name || user.email}</h2>
          <div style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 4, fontFamily: "var(--font-mono, monospace)" }}>{user.email}</div>
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <Badge variant="info">{roleLabel}</Badge>
            <Badge variant={user.active ? "ok" : "muted"}>{user.active ? "cuenta activa" : "cuenta inactiva"}</Badge>
            <Badge variant="tech">id {user.id.slice(0, 8)}</Badge>
          </div>
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">{days}</div>
            <div className="profile-stat-label">días en la plataforma</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 14, letterSpacing: 0.5 }}>Sesión</h3>
        <Row label="Email" value={user.email} mono />
        <Row label="Rol legacy" value={user.role} mono />
        <Row label="ID interno" value={user.id} mono dim />
        <Row label="Creado" value={memberSince.toLocaleString("es-CL")} />
        <p style={{ color: "var(--text-soft)", fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          Si necesitas cambiar tu rol contacta al administrador. Si eres admin, ve a la sección Administración para gestionar usuarios y permisos.
        </p>
      </div>
    </div>
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
