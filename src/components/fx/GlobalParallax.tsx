"use client";

import { useEffect } from "react";
import { usePlatform } from "@/context/PlatformContext";

// Escucha mousemove a nivel window y publica CSS vars --mx, --my
// en :root (rango ~-1..+1). Lo consumen las .card para inclinarse sutil.
// Usa rAF + lerp para suavizar (sin jitter aunque el mouse vaya rapido).
// Se desactiva si el usuario apaga parallaxEnabled en /settings.
export default function GlobalParallax() {
  const { parallaxEnabled } = usePlatform();

  useEffect(() => {
    if (!parallaxEnabled) {
      // Reset vars to 0 cuando se apaga
      document.documentElement.style.setProperty("--mx", "0");
      document.documentElement.style.setProperty("--my", "0");
      return;
    }
    let targetX = 0, targetY = 0;
    let currX = 0, currY = 0;
    let raf = 0;

    function onMove(e: PointerEvent) {
      const w = window.innerWidth, h = window.innerHeight;
      targetX = (e.clientX / w) * 2 - 1;
      targetY = (e.clientY / h) * 2 - 1;
    }
    function loop() {
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
  }, [parallaxEnabled]);

  return null;
}
