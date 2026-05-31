"use client";

import { useEffect } from "react";
import { initSentryClient } from "@/lib/sentry";

/** Componente sin UI. Sólo inicializa Sentry si NEXT_PUBLIC_SENTRY_DSN está seteada. */
export default function SentryBoot() {
  useEffect(() => { initSentryClient(); }, []);
  return null;
}
