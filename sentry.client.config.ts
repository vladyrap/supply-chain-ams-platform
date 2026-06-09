// =============================================================================
// sentry.client.config.ts — Sentry frontend init (v1.1.2-hotfix)
// =============================================================================
// FIX A13 + A14 (audit v1.1.0):
//   - beforeSend filtra headers sensibles (authorization, cookie, csrf), PII
//     en event.user, query strings con tokens, contextos con stack-locals.
//   - NO se expone Sentry como `window.Sentry` (XSS / third-party puede abusar).
//     Si necesitás Sentry desde otro componente, importá directo `@sentry/nextjs`.
// =============================================================================

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-bypass",
  "x-csrf-token",
  "x-api-key",
  "proxy-authorization",
]);

const SENSITIVE_QUERY_KEYS = new Set([
  "token", "access_token", "refresh_token", "auth", "key",
  "api_key", "apikey", "session", "secret", "password",
]);

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return out;
}

function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url, "https://placeholder.local");
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) u.searchParams.set(key, "[REDACTED]");
    }
    return u.pathname + (u.search ? u.search : "");
  } catch {
    return url;
  }
}

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE || 0.1),
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // FIX A13: scrub PII + secrets antes de mandar a Sentry cloud.
      if (event.request) {
        if (event.request.cookies) delete event.request.cookies;
        event.request.headers = scrubHeaders(event.request.headers as Record<string, string>);
        if (event.request.url) event.request.url = scrubUrl(event.request.url);
        if (event.request.query_string) {
          event.request.query_string =
            typeof event.request.query_string === "string"
              ? scrubUrl("/?" + event.request.query_string)?.replace(/^\/\?/, "") || ""
              : event.request.query_string;
        }
      }
      // No mandar email del user a Sentry (GDPR — Sentry no debe contener PII).
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      // Limpiar extras / contexts que pueden tener stack-locals con secrets.
      if (event.extra && typeof event.extra === "object") {
        for (const k of Object.keys(event.extra)) {
          if (SENSITIVE_QUERY_KEYS.has(k.toLowerCase())) event.extra[k] = "[REDACTED]";
        }
      }
      return event;
    },
  });
  // FIX A14: NO exponer Sentry como window global.
  // Para usar desde ErrorBoundary: `import * as Sentry from "@sentry/nextjs"`.
}
