// Cliente del microservicio SAP Clean Core Connector (FastAPI read-only).
// URL configurable por env: NEXT_PUBLIC_SAP_CONNECTOR_URL (ej. http://localhost:8600).
//
// Seguridad: en producción, lo recomendado es proxyear estas llamadas por el
// backend AMS (que inyecta X-Service-Token server-side). El token NUNCA va en el
// browser. En dev, el conector acepta sin token. Ver docs del conector.

const BASE = (process.env.NEXT_PUBLIC_SAP_CONNECTOR_URL || "").replace(/\/+$/, "");

export function isConnectorConfigured(): boolean {
  return !!BASE;
}

export interface SapSystem {
  id: string;
  name: string;
  sid: string;
  system_type: "ECC" | "S4HANA";
  connector_mode: "rfc" | "offline" | "odata";
  default_client: string;
  has_credentials: boolean;
  tech_user_masked: string | null;
  active: boolean;
  created_at: string;
}

export interface SapAssessment {
  id: string;
  system_id: string;
  client: string;
  assessment_type: string;
  source: string;
  status: string;
  index_current: number | null;
  index_potential: number | null;
  cloud_ready_pct: number | null;
  effort_hours_total: number | null;
  open_findings: number | null;
  critical_open: number | null;
  objects_scanned: number | null;
  stats: Record<string, unknown>;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface SapFinding {
  id: string;
  assessment_id: string;
  dimension: string;
  severity: "critical" | "high" | "medium" | "low";
  object_name: string;
  object_type: string;
  package: string | null;
  clean_core_strategy: string;
  effort_hours: number;
  status: string;
  cloud_ready: boolean;
  rule_id: string;
  evidence: string;
  risk: string;
  recommendation: string;
  reference: string | null;
  detected_at: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function headers(actor?: string, tenant?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (actor) h["X-Actor"] = actor;
  if (tenant) h["X-Tenant"] = tenant;
  return h;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  if (!BASE) return { ok: false, error: "Conector SAP no configurado (NEXT_PUBLIC_SAP_CONNECTOR_URL)." };
  try {
    const res = await fetch(`${BASE}${path}`, init);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j?.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* */ }
      return { ok: false, error: msg };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? `Red: ${err.message}` : "error de red" };
  }
}

export function listSystems(actor?: string, tenant?: string) {
  return req<SapSystem[]>("/systems", { headers: headers(actor, tenant) });
}

export function registerSystem(
  body: { name: string; sid: string; system_type: "ECC" | "S4HANA"; connector_mode?: string; default_client?: string; description?: string },
  actor?: string, tenant?: string,
) {
  return req<SapSystem>("/systems", { method: "POST", headers: headers(actor, tenant), body: JSON.stringify(body) });
}

export function testConnection(systemId: string, actor?: string, tenant?: string) {
  return req<{ ok: boolean; detail: string; system_info: Record<string, unknown> }>(
    `/systems/${systemId}/test-connection`, { method: "POST", headers: headers(actor, tenant) });
}

export async function runUpload(systemId: string, file: File, actor?: string, tenant?: string): Promise<Result<SapAssessment>> {
  if (!BASE) return { ok: false, error: "Conector SAP no configurado." };
  const fd = new FormData();
  fd.append("file", file);
  const h: Record<string, string> = {};
  if (actor) h["X-Actor"] = actor;
  if (tenant) h["X-Tenant"] = tenant;
  try {
    const res = await fetch(`${BASE}/systems/${systemId}/assessments/upload`, { method: "POST", headers: h, body: fd });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j?.detail) msg = String(j.detail); } catch { /* */ }
      return { ok: false, error: msg };
    }
    return { ok: true, data: (await res.json()) as SapAssessment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export function listAssessments(systemId: string, actor?: string, tenant?: string) {
  return req<SapAssessment[]>(`/systems/${systemId}/assessments`, { headers: headers(actor, tenant) });
}

export function listFindings(assessmentId: string, filters: Record<string, string> = {}, actor?: string, tenant?: string) {
  const qs = new URLSearchParams(filters).toString();
  return req<SapFinding[]>(`/assessments/${assessmentId}/findings${qs ? `?${qs}` : ""}`, { headers: headers(actor, tenant) });
}

export function recalculate(assessmentId: string, actor?: string, tenant?: string) {
  return req<SapAssessment>(`/assessments/${assessmentId}/recalculate`, { method: "POST", headers: headers(actor, tenant) });
}

export function downloadUrl(assessmentId: string, kind: "json" | "csv" | "xlsx" | "recommendations" | "pdf"): string {
  return `${BASE}/assessments/${assessmentId}/download/${kind}`;
}
