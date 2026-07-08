"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AMS_MODULES_STORAGE,
  type DemoModeState, type DemoScenarioId,
} from "@/types/ams-modules";
import { DEMO_SCENARIOS } from "@/lib/demo/scenarios";

const EVT = "ams-demo-mode-changed";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function defaultState(): DemoModeState {
  return { enabled: false, activeScenario: null, startedAt: null, currentStepIndex: 0 };
}

export interface UseDemoMode {
  state: DemoModeState;
  scenarios: typeof DEMO_SCENARIOS;
  enable: (scenarioId?: DemoScenarioId) => void;
  disable: () => void;
  toggle: () => void;
  selectScenario: (scenarioId: DemoScenarioId) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
}

export function useDemoMode(): UseDemoMode {
  // SSR-safe: estado inicial DETERMINISTA. NO leer localStorage en el initializer:
  // rompe la hidratación (server=default `enabled:false` vs cliente=valor guardado
  // `enabled:true` → DemoModeBanner difiere → React #418/#425 → crash en prod).
  // El valor real se hidrata en el useEffect de abajo, tras montar.
  const [state, setState] = useState<DemoModeState>(defaultState);

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      setState(safe<DemoModeState>(localStorage.getItem(AMS_MODULES_STORAGE.demoMode)) ?? defaultState());
    }
    reload();  // hidratar el estado real de localStorage TRAS montar (post-hidratación)
    function onStorage(e: StorageEvent) {
      if (e.key === AMS_MODULES_STORAGE.demoMode) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  const save = useCallback((next: DemoModeState) => {
    setState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(AMS_MODULES_STORAGE.demoMode, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVT));
    }
  }, []);

  const enable: UseDemoMode["enable"] = useCallback((scenarioId) => {
    save({
      enabled: true,
      activeScenario: scenarioId ?? state.activeScenario ?? DEMO_SCENARIOS[0].id,
      startedAt: new Date().toISOString(),
      currentStepIndex: 0,
    });
  }, [state.activeScenario, save]);

  const disable: UseDemoMode["disable"] = useCallback(() => {
    save({ ...state, enabled: false });
  }, [state, save]);

  const toggle: UseDemoMode["toggle"] = useCallback(() => {
    if (state.enabled) disable(); else enable();
  }, [state.enabled, disable, enable]);

  const selectScenario: UseDemoMode["selectScenario"] = useCallback((scenarioId) => {
    save({ ...state, activeScenario: scenarioId, currentStepIndex: 0 });
  }, [state, save]);

  const nextStep: UseDemoMode["nextStep"] = useCallback(() => {
    const sc = DEMO_SCENARIOS.find((s) => s.id === state.activeScenario);
    if (!sc) return;
    const next = Math.min(sc.steps.length - 1, state.currentStepIndex + 1);
    save({ ...state, currentStepIndex: next });
  }, [state, save]);

  const prevStep: UseDemoMode["prevStep"] = useCallback(() => {
    save({ ...state, currentStepIndex: Math.max(0, state.currentStepIndex - 1) });
  }, [state, save]);

  const goToStep: UseDemoMode["goToStep"] = useCallback((index) => {
    save({ ...state, currentStepIndex: Math.max(0, index) });
  }, [state, save]);

  const reset: UseDemoMode["reset"] = useCallback(() => {
    save(defaultState());
  }, [save]);

  return { state, scenarios: DEMO_SCENARIOS, enable, disable, toggle, selectScenario, nextStep, prevStep, goToStep, reset };
}
