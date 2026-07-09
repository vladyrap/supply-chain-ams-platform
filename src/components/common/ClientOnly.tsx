"use client";

// =============================================================================
// ClientOnly — renderiza children SOLO tras montar en el cliente.
// =============================================================================
// Para vistas inherentemente client-only (visualizaciones real-time: relojes con
// new Date(), partículas con Math.random, canvas, polling). El SSR y el PRIMER
// render del cliente muestran el `fallback` (determinista → coinciden), y la viz
// real se monta después. Así se elimina TODO mismatch de hidratación (React
// #418/#423/#425) en esas páginas sin tener que auditar cada valor no-determinista.
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";

export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
