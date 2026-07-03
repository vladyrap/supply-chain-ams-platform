"use client";

// v1.3 onda 5.1 — el Builder vive ahora dentro del módulo único /agent-hub.
// Esta ruta queda como redirect (preserva ?id= para modo edición).

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToHub() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const id = params.get("id");
    router.replace(`/agent-hub?tab=builder${id ? `&id=${encodeURIComponent(id)}` : ""}`);
  }, [router, params]);
  return null;
}

export default function AgentBuilderRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectToHub />
    </Suspense>
  );
}
