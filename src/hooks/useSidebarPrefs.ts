"use client";

// Preferencias del sidebar: favoritos + secciones colapsadas.
// Persistidas en localStorage. Reactivas a cambios entre tabs.

import { useCallback, useEffect, useState } from "react";

const FAV_KEY = "supply-chain-ams-sidebar-favs";
const COLLAPSED_KEY = "supply-chain-ams-sidebar-collapsed-sections";

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}
function saveSet(key: string, s: Set<string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(Array.from(s))); } catch { /* ignore */ }
}

export function useSidebarPrefs() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAV_KEY));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadSet(COLLAPSED_KEY));

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === FAV_KEY) setFavorites(loadSet(FAV_KEY));
      if (e.key === COLLAPSED_KEY) setCollapsed(loadSet(COLLAPSED_KEY));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSet(FAV_KEY, next);
      return next;
    });
  }, []);

  const toggleSection = useCallback((name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveSet(COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite, collapsed, toggleSection };
}
