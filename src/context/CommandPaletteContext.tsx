"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import CommandPalette from "@/components/command/CommandPalette";

interface CtxValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<CtxValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Atajos globales: ⌘K / Ctrl+K, y "/" cuando no estás en un input
  useEffect(() => {
    function isTypingInField(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }
    function onKey(e: KeyboardEvent) {
      // ⌘+K o Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      // "/" cuando NO estamos tipeando en un input
      if (e.key === "/" && !isTypingInField(e.target)) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      // Esc dentro del palette se maneja en el componente; acá no
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <CommandPalette onClose={close} />}
    </Ctx.Provider>
  );
}

export function useCommandPalette(): CtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return v;
}
