"use client";

// v1.3 onda 5.1 — el Studio (apps agénticas) vive ahora dentro del módulo
// único /agent-hub. Esta ruta queda como redirect.

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

function RedirectToHub() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/agent-hub?tab=apps");
  }, [router]);
  return null;
}

export default function AgentStudioRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectToHub />
    </Suspense>
  );
}
