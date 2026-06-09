// Cliente del backend Escalation N2.
// El backend devuelve y acepta los mismos tipos que ya tiene el frontend
// (camelCase consistente entre ambos lados).

import type {
  EscalationRule, N2Responsible, EscalationRecord,
  ItsmConnectorConfig, EscalationSettings,
} from "@/types/escalation";
import { apiFetch, type ApiFetchOptions } from "./_http";

async function http<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, opts);
}

// ============================================================
// Snapshot
// ============================================================

export interface EscalationSnapshot {
  rules: EscalationRule[];
  responsibles: N2Responsible[];
  records: EscalationRecord[];
  connectors: ItsmConnectorConfig;
  settings: EscalationSettings;
}

export async function getSnapshot(): Promise<EscalationSnapshot> {
  const data = await http<{ success: true } & EscalationSnapshot>("/api/escalation/snapshot");
  return {
    rules: data.rules || [],
    responsibles: data.responsibles || [],
    records: data.records || [],
    connectors: data.connectors,
    settings: data.settings,
  };
}

// ============================================================
// Rules
// ============================================================

export async function upsertRule(rule: EscalationRule): Promise<EscalationRule> {
  const r = await http<{ success: true; rule: EscalationRule }>(
    "/api/escalation/rules", { method: "POST", body: rule }
  );
  return r.rule;
}
export async function deleteRule(id: string): Promise<void> {
  await http(`/api/escalation/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================================
// Responsibles
// ============================================================

export async function upsertResponsible(r: N2Responsible): Promise<N2Responsible> {
  const res = await http<{ success: true; responsible: N2Responsible }>(
    "/api/escalation/responsibles", { method: "POST", body: r }
  );
  return res.responsible;
}
export async function deleteResponsible(id: string): Promise<void> {
  await http(`/api/escalation/responsibles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================================
// Records
// ============================================================

export async function createRecord(rec: EscalationRecord): Promise<EscalationRecord> {
  const res = await http<{ success: true; record: EscalationRecord }>(
    "/api/escalation/records", { method: "POST", body: rec }
  );
  return res.record;
}

export async function updateRecord(id: string, patch: Partial<EscalationRecord>): Promise<EscalationRecord> {
  const res = await http<{ success: true; record: EscalationRecord }>(
    `/api/escalation/records/${encodeURIComponent(id)}`,
    { method: "PATCH", body: patch }
  );
  return res.record;
}

// ============================================================
// Connectors + Settings + Reset
// ============================================================

export async function updateConnectors(patch: Partial<ItsmConnectorConfig>): Promise<ItsmConnectorConfig> {
  const res = await http<{ success: true; connectors: ItsmConnectorConfig }>(
    "/api/escalation/connectors", { method: "PATCH", body: patch }
  );
  return res.connectors;
}

export async function updateSettings(patch: Partial<EscalationSettings>): Promise<EscalationSettings> {
  const res = await http<{ success: true; settings: EscalationSettings }>(
    "/api/escalation/settings", { method: "PATCH", body: patch }
  );
  return res.settings;
}

export async function resetDemo(): Promise<EscalationSnapshot> {
  const data = await http<{ success: true } & EscalationSnapshot>(
    "/api/escalation/reset-demo", { method: "POST" }
  );
  return {
    rules: data.rules || [],
    responsibles: data.responsibles || [],
    records: data.records || [],
    connectors: data.connectors,
    settings: data.settings,
  };
}

/** Detecta si el backend está disponible. Usado para decidir online vs fallback localStorage. */
export async function ping(): Promise<boolean> {
  try {
    await apiFetch("/health", { method: "GET", timeoutMs: 3000 });
    return true;
  } catch {
    return false;
  }
}
