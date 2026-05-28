"use client";

import { useEffect } from "react";

// Escucha mousemove a nivel window y publica CSS vars --mx, --my
// en :root (rango ~-1..+1). Lo consumen las .card para inclinarse sutil.
// Usa rAF + lerp para suavizar (sin jitter aunque el mouse vaya rapido).
export default function GlobalParallax() {
  useEffect(() => {
    let targetX = 0, targetY = 0;
    let currX = 0, currY = 0;
    let raf = 0;

    function onMove(e: PointerEvent) {
      const w = window.innerWidth, h = window.innerHeight;
      targetX = (e.clientX / w) * 2 - 1; // -1..+1
      targetY = (e.clientY / h) * 2 - 1;
    }
    function loop() {
      // lerp suave
      currX += (targetX - currX) * 0.08;
      currY += (targetY - currY) * 0.08;
      document.documentElement.style.setProperty("--mx", currX.toFixed(3));
      document.documentElement.style.setProperty("--my", currY.toFixed(3));
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.style.removeProperty("--mx");
      document.documentElement.style.removeProperty("--my");
    };
  }, []);

  return null;
}
