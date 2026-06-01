"use client";

// Wrapper "drop-in" para los modales del proyecto que ya usan las clases
// CSS `.tc-modal-back` / `.tc-modal` definidas en globals.css.
//
// Su único trabajo es renderizar el contenido vía createPortal en document.body
// para sacarlo del containing block roto por `.card { transform + backdrop-filter }`.
//
// Migración mecánica:
//   ANTES:   <div className="tc-modal-back" onClick={onClose}>
//              <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
//                ... contenido ...
//              </div>
//            </div>
//
//   AHORA:   <TcModalShell onClose={onClose}>
//              <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
//                ... contenido ...
//              </div>
//            </TcModalShell>
//
// La clase `.tc-modal-back` ya tiene z-index 9000 y backdrop-filter — los
// preservamos. Solo agregamos el portal + lock scroll + Escape.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

let bodyLockCount = 0;
let originalOverflow: string | null = null;

export default function TcModalShell({
  onClose, children,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;
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
  }, []);

  // Escape key
  useEffect(() => {
    if (!closeOnEscape) return;
    function h(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [closeOnEscape, onClose]);

  // Anti-drag-close: si el mousedown empieza dentro del contenido y termina afuera
  // del contenedor, NO cerramos.
  const downOnBackdropRef = useRef(false);

  if (!mounted) return null;

  return createPortal(
    <div
      className="tc-modal-back"
      onMouseDown={(e) => {
        downOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (closeOnBackdrop && downOnBackdropRef.current && e.target === e.currentTarget) {
          onClose();
        }
        downOnBackdropRef.current = false;
      }}
    >
      {children}
    </div>,
    document.body
  );
}
