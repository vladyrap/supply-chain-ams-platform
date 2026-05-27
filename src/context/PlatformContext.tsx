"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Environment, Role } from "@/types";
import { useAuth } from "./AuthContext";

export type Theme = "default" | "cyberpunk";

interface PlatformState {
  role: Role;             // ahora viene del usuario autenticado (fallback "viewer" si no hay user)
  client: string;
  environment: Environment;
  autoSpeak: boolean;
  theme: Theme;
  fxEnabled: boolean;     // confetti + audio reactivo
  setClient: (c: string) => void;
  setEnvironment: (e: Environment) => void;
  setAutoSpeak: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  setFxEnabled: (v: boolean) => void;
}

const PlatformContext = createContext<PlatformState | null>(null);
const STORAGE_KEY = "ams-platform-state-v2";

interface PersistedState {
  client: string;
  environment: Environment;
  autoSpeak: boolean;
  theme: Theme;
  fxEnabled: boolean;
}

const DEFAULTS: PersistedState = {
  client: "demo",
  environment: "DEV",
  autoSpeak: false,
  theme: "default",
  fxEnabled: false,
};

function loadFromStorage(): PersistedState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return DEFAULTS;
  }
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PersistedState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state, hydrated]);

  // Aplicar tema al <html> para que CSS global pueda usar [data-theme="cyberpunk"]
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  const value: PlatformState = {
    role: (user?.role ?? "viewer") as Role,
    client:        state.client,
    environment:   state.environment,
    autoSpeak:     state.autoSpeak,
    theme:         state.theme,
    fxEnabled:     state.fxEnabled,
    setClient:      (client)      => setState((s) => ({ ...s, client })),
    setEnvironment: (environment) => setState((s) => ({ ...s, environment })),
    setAutoSpeak:   (autoSpeak)   => setState((s) => ({ ...s, autoSpeak })),
    setTheme:       (theme)       => setState((s) => ({ ...s, theme })),
    setFxEnabled:   (fxEnabled)   => setState((s) => ({ ...s, fxEnabled })),
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
