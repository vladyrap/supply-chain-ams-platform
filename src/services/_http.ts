// =============================================================================
// _http.ts — Cliente HTTP central (v1.2.0 multi-tenant)
// =============================================================================
// Wrapper único sobre fetch() que:
//   - Centraliza API_BASE
//   - Mete cookies (credentials: include)
//   - Setea Content-Type apropiado
//   - Lee X-Tenant-Id desde TenantContext (si necesario para super_admin)
//   - Maneja respuestas {success: false} consistentemente
//   - Acepta AbortSignal
//
// Antes había 24 archivos .api.ts cada uno con su propio call()/http() y la
// línea `const API_BASE = process.env.NEXT_PUBLIC_AGENT_API_URL || ...`.
// Migrar a este wrapper progresivamente.
// =============================================================================

export const API_BASE =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_AGENT_API_URL as string | undefined)) ||
  "http://localhost:6601";

const CLEAN_API_BASE = API_BASE.replace(/\/+$/, "");

/**
 * Tenant override — solo lo usa super_admin para ver datos de otro tenant.
 * Set/clear desde TenantContext.
 */
let _tenantOverride: string | null = null;
export function setTenantOverride(tenantId: string | null): void {
  _tenantOverride = tenantId;
}
export function getTenantOverride(): string | null {
  return _tenantOverride;
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Body: si es objeto se serializa a JSON automáticamente. */
  body?: unknown;
  /** Si true, no setea Content-Type automáticamente (útil para multipart). */
  rawBody?: boolean;
  /** Override del tenant para esta call (super_admin). */
  tenantOverride?: string | null;
  /** Si true, no incluye credentials (para endpoints públicos). */
  noCredentials?: boolean;
  /** Timeout en ms — si null, sin timeout. Default: 30s. */
  timeoutMs?: number | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch genérico tipado.
 * @example
 *   const data = await apiFetch<{tickets: Ticket[]}>("/api/tickets");
 *   const ok = await apiFetch<void>("/api/tickets/X-1", { method: "DELETE" });
 *   const res = await apiFetch("/api/tenants", {method:"POST", body:{id:"acme",name:"ACME"}});
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    rawBody = false,
    tenantOverride,
    noCredentials = false,
    timeoutMs = 30_000,
    headers: userHeaders,
    signal: userSignal,
    ...rest
  } = opts;

  const url = path.startsWith("http") ? path : `${CLEAN_API_BASE}${path}`;

  // Headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(userHeaders as Record<string, string> | undefined),
  };

  // Tenant override (super_admin viewing other tenant)
  const effectiveTenantOverride = tenantOverride ?? _tenantOverride;
  if (effectiveTenantOverride) {
    headers["X-Tenant-Id"] = effectiveTenantOverride;
  }

  // Body handling
  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (rawBody) {
      finalBody = body as BodyInit;
    } else if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
      finalBody = body;
    } else if (typeof body === "string") {
      finalBody = body;
    } else {
      finalBody = JSON.stringify(body);
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }
  }

  // Timeout — combina con userSignal si vino
  const ctl = new AbortController();
  const tid = timeoutMs ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  // Si el caller pasó signal, escuchar para abortar el nuestro también
  if (userSignal) {
    if (userSignal.aborted) ctl.abort();
    else userSignal.addEventListener("abort", () => ctl.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      ...rest,
      headers,
      body: finalBody,
      credentials: noCredentials ? "omit" : "include",
      signal: ctl.signal,
    });

    // Parse response
    const contentType = res.headers.get("content-type") || "";
    let parsed: unknown = null;
    if (contentType.includes("application/json")) {
      parsed = await res.json().catch(() => null);
    } else if (res.status === 204 || res.status === 205) {
      parsed = null;
    } else {
      parsed = await res.text().catch(() => null);
    }

    if (!res.ok) {
      const parsedErr =
        parsed && typeof parsed === "object" ? (parsed as { error?: string }).error : null;
      const msg: string = parsedErr || `HTTP ${res.status}`;
      throw new ApiError(res.status, parsed, msg);
    }
    return parsed as T;
  } finally {
    if (tid) clearTimeout(tid);
  }
}

// Helpers convenience
export const apiGet = <T = unknown>(path: string, opts?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...opts, method: "GET" });

export const apiPost = <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...opts, method: "POST", body });

export const apiPut = <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...opts, method: "PUT", body });

export const apiPatch = <T = unknown>(path: string, body?: unknown, opts?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...opts, method: "PATCH", body });

export const apiDelete = <T = unknown>(path: string, opts?: ApiFetchOptions) =>
  apiFetch<T>(path, { ...opts, method: "DELETE" });
