// =============================================================================
// Customer Responses API — frontend client
// =============================================================================
// Cliente HTTP para customer_responses backend (POST /api/tickets/:key/responses,
// GET, PATCH status, DELETE).
//
// El hook useCustomerResponses sigue usando localStorage como cache rápida;
// estas funciones sincronizan con backend cuando el user guarda/cambia status.
// =============================================================================

import type { CustomerResponse, CustomerResponseStatus } from "@/types/customer-response";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

async function call<T>(path: string, init: RequestInit = {}): Promise<T | { success: false; error: string }> {
  try {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) };
    if (init.body != null && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T | null;
    if (!data) return { success: false, error: `HTTP ${res.status}` };
    return data;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export interface CustomerResponseRow {
  response_id: string;
  ticket_key: string;
  response_type: string;
  audience: string;
  tone: string;
  confidence: string;
  subject: string;
  body: string;
  summary: string;
  status: string;
  can_send: boolean;
  quality_score: number;
  generated_by: string;
  created_at: string;
  updated_at: string;
  full_payload: Record<string, unknown>;
}

/** Convierte CustomerResponse al payload backend. */
function toBackendPayload(r: CustomerResponse) {
  return {
    responseId: r.responseId,
    ticketKey: r.ticketKey,
    responseType: r.responseType,
    audience: r.audience,
    tone: r.tone,
    confidence: r.confidence,
    subject: r.subject,
    body: r.body,
    summary: r.summary,
    status: r.status,
    canSend: r.canSendToClient,
    qualityScore: r.qualityGate.score,
    generatedBy: r.generatedBy,
    fullPayload: r as unknown as Record<string, unknown>,
  };
}

/**
 * Guarda una respuesta en el backend. Upsert por responseId.
 * Devuelve la row tal como quedó persistida.
 */
export async function persistCustomerResponse(r: CustomerResponse) {
  return call<{ success: true; response: CustomerResponseRow } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(r.ticketKey)}/responses`,
    { method: "POST", body: JSON.stringify(toBackendPayload(r)) },
  );
}

export async function fetchCustomerResponsesByTicket(ticketKey: string) {
  return call<{ success: true; count: number; responses: CustomerResponseRow[] } | { success: false; error: string }>(
    `/api/tickets/${encodeURIComponent(ticketKey)}/responses`,
  );
}

export async function updateCustomerResponseStatusApi(
  responseId: string, status: CustomerResponseStatus,
) {
  return call<{ success: true; response: CustomerResponseRow } | { success: false; error: string }>(
    `/api/customer-responses/${encodeURIComponent(responseId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export async function deleteCustomerResponseApi(responseId: string) {
  return call<{ success: true } | { success: false; error: string }>(
    `/api/customer-responses/${encodeURIComponent(responseId)}`,
    { method: "DELETE" },
  );
}
