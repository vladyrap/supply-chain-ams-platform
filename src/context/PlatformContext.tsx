"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Environment, Role } from "@/types";
import { useAuth } from "./AuthContext";
import { useTenant } from "./TenantContext";

export type Theme = "default" | "cyberpunk";
export type AccentColor = "cyan" | "violet" | "amber" | "green" | "rose";

// Mapeo de chip de color → triplete RGB para CSS vars (--accent + glow color).
// Estos se aplican como variables CSS al :root para que toda la plataforma respete el accent.
export const ACCENT_COLORS: Record<AccentColor, { name: string; hex: string; rgb: string; soft: string }> = {
  cyan:   { name: "IBM Blue", hex: "#0F62FE", rgb: "15,98,254",  soft: "rgba(15,98,254, 0.16)" },
  violet: { name: "Violeta", hex: "#a855f7", rgb: "168, 85, 247", soft: "rgba(168, 85, 247, 0.16)" },
  amber:  { name: "Ámbar",   hex: "#f1c21b", rgb: "241,194,27", soft: "rgba(241,194,27, 0.16)" },
  green:  { name: "Verde",   hex: "#10b981", rgb: "16, 185, 129", soft: "rgba(16, 185, 129, 0.16)" },
  rose:   { name: "Rosa",    hex: "#f43f5e", rgb: "244, 63, 94",  soft: "rgba(244, 63, 94, 0.16)" },
};

interface PlatformState {
  role: Role;
  client: string;
  environment: Environment;
  autoSpeak: boolean;
  theme: Theme;
  fxEnabled: boolean;

  // NUEVO: preferencias de apariencia / FX globales
  accentColor: AccentColor;
  auroraIntensity: number;       // 0..100
  parallaxEnabled: boolean;
  glassmorphismEnabled: boolean;
  soundsEnabled: boolean;
  splashEnabled: boolean;
  voiceRate: number;             // 0.5..2.0
  voicePitch: number;            // 0..2
  voiceUri: string;              // SpeechSynthesisVoice.voiceURI

  setClient: (c: string) => void;
  setEnvironment: (e: Environment) => void;
  setAutoSpeak: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  setFxEnabled: (v: boolean) => void;

  setAccentColor: (c: AccentColor) => void;
  setAuroraIntensity: (v: number) => void;
  setParallaxEnabled: (v: boolean) => void;
  setGlassmorphismEnabled: (v: boolean) => void;
  setSoundsEnabled: (v: boolean) => void;
  setSplashEnabled: (v: boolean) => void;
  setVoiceRate: (v: number) => void;
  setVoicePitch: (v: number) => void;
  setVoiceUri: (uri: string) => void;
}

const PlatformContext = createContext<PlatformState | null>(null);
const STORAGE_KEY = "ams-platform-state-v3";

interface PersistedState {
  client: string;
  environment: Environment;
  autoSpeak: boolean;
  theme: Theme;
  fxEnabled: boolean;
  accentColor: AccentColor;
  auroraIntensity: number;
  parallaxEnabled: boolean;
  glassmorphismEnabled: boolean;
  soundsEnabled: boolean;
  splashEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceUri: string;
}

const DEFAULTS: PersistedState = {
  client: "demo",
  environment: "DEV",
  autoSpeak: false,
  theme: "default",
  fxEnabled: false,
  accentColor: "cyan",
  // REDL: minimal, sin efectos flashy (aurora/parallax/glassmorphism/splash/confetti).
  auroraIntensity: 0,
  parallaxEnabled: false,
  glassmorphismEnabled: false,
  soundsEnabled: false,
  splashEnabled: false,
  voiceRate: 1.0,
  voicePitch: 1.0,
  voiceUri: "",
};

function loadFromStorage(): PersistedState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migración suave: si existe la clave v2 vieja, importamos sus campos
      const old = window.localStorage.getItem("ams-platform-state-v2");
      if (old) {
        return { ...DEFAULTS, ...(JSON.parse(old) as Partial<PersistedState>), theme: "default", auroraIntensity: 0, parallaxEnabled: false, glassmorphismEnabled: false, splashEnabled: false, fxEnabled: false };
      }
      return DEFAULTS;
    }
    // theme: "default" forzado — la plataforma queda SIEMPRE en tema claro IBM
    // Carbon (blanco), aunque el usuario tuviera "cyberpunk" persistido de una
    // sesión previa. El toggle de tema se removió del Header.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedState>), theme: "default", auroraIntensity: 0, parallaxEnabled: false, glassmorphismEnabled: false, splashEnabled: false, fxEnabled: false };
  } catch {
    return DEFAULTS;
  }
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [state, setState] = useState<PersistedState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  /** Si el user ya tenía preferencia guardada al hidratar, NO pisamos con tenant. */
  const hadUserAccentRef = useRef<boolean>(false);
  /** Para aplicar tenant.accent una sola vez por tenant detectado. */
  const lastTenantAccentRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          if (parsed && typeof parsed.accentColor === "string") {
            hadUserAccentRef.current = true;
          }
        }
      } catch { /* ignore */ }
    }
    setState(loadFromStorage());
    setHydrated(true);
  }, []);

  // Aplicar tenant.brand.accent como default override (solo si user NO eligió otro)
  useEffect(() => {
    if (!hydrated) return;
    if (hadUserAccentRef.current) return; // user ya tiene preferencia explícita
    const accent = tenant?.brand?.accent;
    if (!accent) return;
    if (lastTenantAccentRef.current === accent) return;
    lastTenantAccentRef.current = accent;
    // Si el accent del tenant matchea una key conocida (cyan/violet/amber/green/rose),
    // lo seteamos como AccentColor. Si es un hex libre, lo aplicamos como CSS var
    // sin modificar state.accentColor (el toggle del user sigue funcionando).
    const normalized = accent.toLowerCase();
    if (normalized in ACCENT_COLORS) {
      setState((s) => ({ ...s, accentColor: normalized as AccentColor }));
    } else if (typeof document !== "undefined" && /^#[0-9a-f]{6}$/i.test(accent)) {
      document.documentElement.style.setProperty("--accent", accent);
    }
  }, [tenant?.brand?.accent, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state, hydrated]);

  // Aplicar tema al <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  // Aplicar accent color y flags como CSS variables / data-attributes globales
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const color = ACCENT_COLORS[state.accentColor];
    root.style.setProperty("--accent",      color.hex);
    root.style.setProperty("--accent-rgb",  color.rgb);
    root.style.setProperty("--accent-soft", color.soft);
    root.setAttribute("data-glassmorphism", state.glassmorphismEnabled ? "on" : "off");
    root.setAttribute("data-parallax",      state.parallaxEnabled ? "on" : "off");
    root.style.setProperty("--aurora-opacity", String(state.auroraIntensity / 100));
  }, [state.accentColor, state.glassmorphismEnabled, state.parallaxEnabled, state.auroraIntensity]);

  const value: PlatformState = {
    role: (user?.role ?? "viewer") as Role,
    client:               state.client,
    environment:          state.environment,
    autoSpeak:            state.autoSpeak,
    theme:                state.theme,
    fxEnabled:            state.fxEnabled,
    accentColor:          state.accentColor,
    auroraIntensity:      state.auroraIntensity,
    parallaxEnabled:      state.parallaxEnabled,
    glassmorphismEnabled: state.glassmorphismEnabled,
    soundsEnabled:        state.soundsEnabled,
    splashEnabled:        state.splashEnabled,
    voiceRate:            state.voiceRate,
    voicePitch:           state.voicePitch,
    voiceUri:             state.voiceUri,
    setClient:               (client)      => setState((s) => ({ ...s, client })),
    setEnvironment:          (environment) => setState((s) => ({ ...s, environment })),
    setAutoSpeak:            (autoSpeak)   => setState((s) => ({ ...s, autoSpeak })),
    setTheme:                (theme)       => setState((s) => ({ ...s, theme })),
    setFxEnabled:            (fxEnabled)   => setState((s) => ({ ...s, fxEnabled })),
    setAccentColor:          (accentColor) => setState((s) => ({ ...s, accentColor })),
    setAuroraIntensity:      (v)           => setState((s) => ({ ...s, auroraIntensity: Math.max(0, Math.min(100, v)) })),
    setParallaxEnabled:      (parallaxEnabled)      => setState((s) => ({ ...s, parallaxEnabled })),
    setGlassmorphismEnabled: (glassmorphismEnabled) => setState((s) => ({ ...s, glassmorphismEnabled })),
    setSoundsEnabled:        (soundsEnabled)        => setState((s) => ({ ...s, soundsEnabled })),
    setSplashEnabled:        (splashEnabled)        => setState((s) => ({ ...s, splashEnabled })),
    setVoiceRate:            (v)                    => setState((s) => ({ ...s, voiceRate: Math.max(0.5, Math.min(2, v)) })),
    setVoicePitch:           (v)                    => setState((s) => ({ ...s, voicePitch: Math.max(0, Math.min(2, v)) })),
    setVoiceUri:             (voiceUri)             => setState((s) => ({ ...s, voiceUri })),
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
