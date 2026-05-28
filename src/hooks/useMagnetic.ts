"use client";

import { useEffect, useRef } from "react";

/**
 * Magnetic hover: el elemento se atrae al cursor cuando hover.
 * Aplica transform translate3d directo al element via ref (sin re-render).
 *
 * Cancela el efecto en pointerleave volviendo suavemente a (0,0).
 * Disable automatico si el navegador prefiere reducir movimiento.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 18) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respetar prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let tx = 0, ty = 0;
    let cx = 0, cy = 0;
    let inside = false;
    let raf = 0;

    function onMove(e: PointerEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = e.clientX - (r.left + r.width / 2);
      const py = e.clientY - (r.top + r.height / 2);
      tx = (px / r.width) * strength;
      ty = (py / r.height) * strength;
    }
    function onEnter() { inside = true; }
    function onLeave() { inside = false; tx = 0; ty = 0; }

    function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      // Solo aplicamos si hay movimiento significativo o estamos dentro,
      // así no peleamos contra transitions CSS en estado idle.
      if (Math.abs(cx) > 0.05 || Math.abs(cy) > 0.05 || inside) {
        if (el) el.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
      } else {
        if (el) el.style.translate = "";
      }
      raf = requestAnimationFrame(loop);
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.translate = "";
    };
  }, [strength]);

  return ref;
}
