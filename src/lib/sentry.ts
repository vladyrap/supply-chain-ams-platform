"use client";

// Sentry init para frontend Next.js. Sólo carga si NEXT_PUBLIC_SENTRY_DSN está seteada.
// Lazy: se carga dinámicamente desde el cliente para no impactar bundle si no se usa.

let initialized = false;

export function initSentryClient(): void {
  if (typeof window === "undefined" || initialized) return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  initialized = true;
  // Carga dinámica para no inflar el bundle inicial si no hay DSN.
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES || 0.05),
      replaysSessionSampleRate: 0, // sin replay por default
      replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR || 0),
      sendDefaultPii: false,
    });
  }).catch(() => {
    // Si la dependencia no está disponible en runtime, sigue sin Sentry.
  });
}

export function captureClientException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context) {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
      }
      Sentry.captureException(err);
    });
  }).catch(() => null);
}
