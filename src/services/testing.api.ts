// Cliente del backend Testing Intelligence.
// Soporta upload de videos via multipart/form-data.

import type {
  TestingScenario, EvidenceItem, TestDefect,
  GeneratedUserManual, TestingSettings,
} from "@/types/testing";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// Snapshot
// ============================================================

export interface TestingSnapshot {
  scenarios: TestingScenario[];
  evidences: EvidenceItem[];
  defects: TestDefect[];
  manuals: GeneratedUserManual[];
  settings: TestingSettings;
}

export async function getSnapshot(): Promise<TestingSnapshot> {
  const data = await http<{ success: true } & TestingSnapshot>("/api/testing/snapshot");
  return {
    scenarios: data.scenarios || [],
    evidences: data.evidences || [],
    defects: data.defects || [],
    manuals: data.manuals || [],
    settings: data.settings,
  };
}

// ============================================================
// Scenarios
// ============================================================

export async function upsertScenario(s: TestingScenario): Promise<TestingScenario> {
  const r = await http<{ success: true; scenario: TestingScenario }>(
    "/api/testing/scenarios", { method: "POST", body: JSON.stringify(s) }
  );
  return r.scenario;
}
export async function deleteScenario(id: string): Promise<void> {
  await http(`/api/testing/scenarios/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================================
// Evidences — JSON (NOTE / LINK / LOG)
// ============================================================

export async function createEvidenceJson(e: EvidenceItem): Promise<EvidenceItem> {
  const r = await http<{ success: true; evidence: EvidenceItem }>(
    "/api/testing/evidences", { method: "POST", body: JSON.stringify(e) }
  );
  return r.evidence;
}
export async function deleteEvidence(id: string): Promise<void> {
  await http(`/api/testing/evidences/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================================
// Evidence binario (upload multipart)
// ============================================================

export interface UploadEvidenceInput {
  scenarioId: string;
  file: File | Blob;
  type: "SCREEN_RECORDING" | "UPLOADED_VIDEO" | "SCREENSHOT" | "FILE";
  title: string;
  description?: string;
  durationSeconds?: number;
  tags?: string[];
  createdBy: string;
  filename?: string;
}

export async function uploadEvidence(input: UploadEvidenceInput): Promise<EvidenceItem> {
  const form = new FormData();
  form.append("scenarioId", input.scenarioId);
  form.append("type", input.type);
  form.append("title", input.title);
  if (input.description) form.append("description", input.description);
  if (input.durationSeconds != null) form.append("durationSeconds", String(input.durationSeconds));
  if (input.tags && input.tags.length) form.append("tags", input.tags.join(","));
  form.append("createdBy", input.createdBy);

  const fileName = input.filename
    || (input.file instanceof File ? input.file.name : `recording-${Date.now()}.webm`);
  form.append("file", input.file, fileName);

  const res = await fetch(`${API_BASE}/api/testing/evidences/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const json = await res.json() as { success: true; evidence: EvidenceItem };
  return json.evidence;
}

/** URL pública para reproducir el video subido. */
export function evidenceFileUrl(id: string): string {
  return `${API_BASE}/api/testing/evidences/${encodeURIComponent(id)}/file`;
}

// ============================================================
// Defects
// ============================================================

export async function upsertDefect(d: TestDefect): Promise<TestDefect> {
  const r = await http<{ success: true; defect: TestDefect }>(
    "/api/testing/defects", { method: "POST", body: JSON.stringify(d) }
  );
  return r.defect;
}
export async function deleteDefect(id: string): Promise<void> {
  await http(`/api/testing/defects/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ============================================================
// Manuals
// ============================================================

export async function upsertManual(m: GeneratedUserManual): Promise<GeneratedUserManual> {
  const r = await http<{ success: true; manual: GeneratedUserManual }>(
    "/api/testing/manuals", { method: "POST", body: JSON.stringify(m) }
  );
  return r.manual;
}

// ============================================================
// Settings + reset
// ============================================================

export async function updateSettings(patch: Partial<TestingSettings>): Promise<TestingSettings> {
  const r = await http<{ success: true; settings: TestingSettings }>(
    "/api/testing/settings", { method: "PATCH", body: JSON.stringify(patch) }
  );
  return r.settings;
}

export async function resetDemo(): Promise<TestingSnapshot> {
  const data = await http<{ success: true } & TestingSnapshot>(
    "/api/testing/reset-demo", { method: "POST" }
  );
  return {
    scenarios: data.scenarios || [],
    evidences: data.evidences || [],
    defects: data.defects || [],
    manuals: data.manuals || [],
    settings: data.settings,
  };
}
