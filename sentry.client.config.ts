// =============================================================================
// sentry.client.config.ts — Sentry frontend init (v1.1.0)
// =============================================================================
// Solo activa si NEXT_PUBLIC_SENTRY_DSN está seteada en env.
// Si no, no inicializa (cero overhead).
//
// Reporta:
//   - Errores no capturados (window.onerror)
//   - Promise rejections sin .catch
//   - Errores reportados manualmente (Sentry.captureException)
//   - Performance traces (sampled 10%)
// =============================================================================

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE || 0.1),
    replaysSessionSampleRate: 0.01, // 1% de sesiones grabadas
    replaysOnErrorSampleRate: 1.0,   // 100% de sesiones que crashearon
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,         // GDPR: nunca mandar texto del cliente
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // Filtrar PII si llegara
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });
  // eslint-disable-next-line no-console
  if (typeof window !== "undefined") (window as unknown as { Sentry: typeof Sentry }).Sentry = Sentry;
}
