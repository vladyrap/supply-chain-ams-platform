"use client";

// v1.3 onda 5.1 — la Biblioteca vive ahora dentro del módulo único /agent-hub.
// Esta ruta queda como redirect para no romper links/favoritos existentes.

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

function RedirectToHub() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/agent-hub?tab=library");
  }, [router]);
  return null;
}

export default function AgentLibraryRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectToHub />
    </Suspense>
  );
}
