"use client";

// Portal global para modales.
//
// Problema que resuelve: la clase `.card` del proyecto usa
// `transform: perspective(...)` + `backdrop-filter: blur()` para el efecto
// parallax 3D + glassmorphism. Ambos crean un NUEVO containing block según
// la spec CSS, lo que rompe `position: fixed` de cualquier modal renderizado
// como descendiente — el modal se posiciona relativo al `.card` en lugar
// del viewport, quedando cortado dentro del Ticket Command Center.
//
// Solución: createPortal(children, document.body) saca el modal del árbol
// DOM del Command Center y lo monta directo bajo <body>, fuera del alcance
// del transform/backdrop-filter. El position:fixed vuelve a funcionar
// correctamente.
//
// Además:
// - SSR-safe (solo monta cuando window existe)
// - Bloquea scroll del body mientras está abierto
// - Cierra con Escape
// - Cierra al click en backdrop (opcional)
// - z-index alto (9500) — bajo CommandPalette (9999) y sobre el bot flotante.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ModalPortalProps {
  open: boolean;
  onClose: () => void;
  /** Cierra al click fuera del contenido. Default true. */
  closeOnBackdrop?: boolean;
  /** Cierra al apretar Escape. Default true. */
  closeOnEscape?: boolean;
  /** ancho máximo del contenido. Default 720px. */
  maxWidth?: number | string;
  /** Padding alrededor (para que en mobile no toque los bordes). Default 20px. */
  padding?: number;
  /** className extra para el wrapper de contenido (clases CSS del proyecto, ej. `card`). */
  contentClassName?: string;
  /** Z-index del overlay. Default 9500 (bajo CommandPalette 9999, sobre el bot). */
  zIndex?: number;
  children: React.ReactNode;
  /** ARIA labelledby */
  labelledBy?: string;
}

/**
 * Hook interno: bloquea scroll del body mientras hay modales abiertos.
 * Soporta múltiples modales simultáneos contando referencias.
 */
let bodyLockCount = 0;
let originalOverflow: string | null = null;
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    if (bodyLockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    bodyLockCount += 1;
    return () => {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0 && originalOverflow !== null) {
        document.body.style.overflow = originalOverflow;
        originalOverflow = null;
      }
    };
  }, [active]);
}

export default function ModalPortal({
  open, onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  maxWidth = 720,
  padding = 20,
  contentClassName,
  zIndex = 9500,
  children,
  labelledBy,
}: ModalPortalProps) {
  // SSR-safe mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useBodyScrollLock(open);

  // Escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  // ref para evitar que onClose dispare cuando el click empieza dentro del contenido
  // y termina afuera (drag accidental sobre el backdrop).
  const downOnBackdropRef = useRef(false);

  if (!mounted || !open) return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(e) => {
        downOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (closeOnBackdrop && downOnBackdropRef.current && e.target === e.currentTarget) {
          onClose();
        }
        downOnBackdropRef.current = false;
      }}
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "rgba(2,6,23,0.78)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding,
        // Aseguramos que el overlay esté DESACOPLADO del posible scroll padre
        overflow: "auto",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        className={contentClassName}
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          maxHeight: `calc(100vh - ${padding * 2}px)`,
          overflowY: "auto",
          // El contenido tiene su propio fondo si trae className="card";
          // si no, le damos uno mínimo para que no se vea transparente
          ...(contentClassName ? {} : {
            background: "var(--bg-card, #0b1220)",
            border: "1px solid var(--border-soft, rgba(255,255,255,0.1))",
            borderRadius: 10,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }),
        }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
