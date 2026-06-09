// =============================================================================
// sentry.server.config.ts — Sentry server-side init Next.js (v1.1.0)
// =============================================================================
// Captures errors en API routes + Server Components + middleware.
// =============================================================================

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.1),
  });
}
