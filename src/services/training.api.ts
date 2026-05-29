// Cliente del backend training.
// Tipos exportados con el shape que ya espera el frontend (snake_case del backend
// se transforma a camelCase en cliente para que el hook no cambie).

import type {
  KnowledgeItem, TrainingQA, TrainingVersion, KnowledgeGap, TrainingSettings,
  KnowledgeStatus, KnowledgeType, Priority, ValidationStage,
  TrainingVersionStatus, GapStatus,
} from "@/types/training";

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

interface ItemRow {
  id: string;
  title: string;
  content: string;
  summary: string;
  module: string;
  process: string;
  type: KnowledgeType;
  source: string;
  tags: string[];
  priority: Priority;
  status: KnowledgeStatus;
  score: number;
  version: string;
  author: string;
  created_at: string;
  updated_at: string;
  validated_by: string | null;
  published_at: string | null;
  validation_stage: ValidationStage;
  functional_validated_by: string | null;
  technical_validated_by: string | null;
  rejection_reason: string | null;
}

interface QARow {
  id: string;
  knowledge_item_id: string;
  question: string;
  expected_answer: string;
  approved: boolean;
  created_at: string;
}

interface VersionRow {
  id: string;
  version: string;
  description: string;
  status: TrainingVersionStatus;
  item_count: number;
  validated_count: number;
  published_count: number;
  created_by: string;
  created_at: string;
  published_at: string | null;
  changelog: string[];
}

interface GapRow {
  id: string;
  title: string;
  description: string;
  module: string;
  process: string;
  priority: Priority;
  suggested_action: string;
  status: GapStatus;
  created_at: string;
  resolved_at: string | null;
}

interface SettingsRow {
  id: string;
  min_score_to_publish: number;
  require_functional_validation: boolean;
  require_technical_validation: boolean;
  allow_auto_publish: boolean;
  active_modules: string[];
  main_language: "es" | "en";
  response_format: "concise" | "structured" | "narrative";
  version_retention: number;
  strict_mode: boolean;
  updated_at: string;
}

// ----- mappers snake_case → camelCase -----
export function mapItem(r: ItemRow): KnowledgeItem {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    summary: r.summary,
    module: r.module,
    process: r.process,
    type: r.type,
    source: r.source,
    tags: r.tags ?? [],
    priority: r.priority,
    status: r.status,
    score: r.score,
    version: r.version,
    author: r.author,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    validatedBy: r.validated_by,
    publishedAt: r.published_at,
    validationStage: r.validation_stage,
    functionalValidatedBy: r.functional_validated_by,
    technicalValidatedBy: r.technical_validated_by,
    rejectionReason: r.rejection_reason,
  };
}
function mapQA(r: QARow): TrainingQA {
  return {
    id: r.id, knowledgeItemId: r.knowledge_item_id,
    question: r.question, expectedAnswer: r.expected_answer,
    approved: r.approved, createdAt: r.created_at,
  };
}
function mapVersion(r: VersionRow): TrainingVersion {
  return {
    id: r.id, version: r.version, description: r.description, status: r.status,
    itemCount: r.item_count, validatedCount: r.validated_count, publishedCount: r.published_count,
    createdBy: r.created_by, createdAt: r.created_at, publishedAt: r.published_at,
    changelog: r.changelog ?? [],
  };
}
function mapGap(r: GapRow): KnowledgeGap {
  return {
    id: r.id, title: r.title, description: r.description, module: r.module, process: r.process,
    priority: r.priority, suggestedAction: r.suggested_action,
    status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at,
  };
}
function mapSettings(r: SettingsRow): TrainingSettings {
  return {
    minScoreToPublish: r.min_score_to_publish,
    requireFunctionalValidation: r.require_functional_validation,
    requireTechnicalValidation: r.require_technical_validation,
    allowAutoPublish: r.allow_auto_publish,
    activeModules: r.active_modules ?? [],
    mainLanguage: r.main_language,
    responseFormat: r.response_format,
    versionRetention: r.version_retention,
    strictMode: r.strict_mode,
  };
}

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
      ...init,
    });
    const data = await res.json().catch(() => null);
    if (!data || !data.success) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

// ============================================================================
// SNAPSHOT
// ============================================================================
export interface TrainingSnapshotMapped {
  knowledge: KnowledgeItem[];
  qa: TrainingQA[];
  versions: TrainingVersion[];
  gaps: KnowledgeGap[];
  settings: TrainingSettings;
}

interface SnapshotRaw {
  knowledge: ItemRow[];
  qa: QARow[];
  versions: VersionRow[];
  gaps: GapRow[];
  settings: SettingsRow;
}

export async function fetchTrainingSnapshot(): Promise<
  { ok: true; snapshot: TrainingSnapshotMapped } | { ok: false; error: string }
> {
  const r = await call<SnapshotRaw>("/api/training/snapshot");
  if (!r.ok) return r;
  const s = r.data;
  return {
    ok: true,
    snapshot: {
      knowledge: (s.knowledge ?? []).map(mapItem),
      qa: (s.qa ?? []).map(mapQA),
      versions: (s.versions ?? []).map(mapVersion),
      gaps: (s.gaps ?? []).map(mapGap),
      settings: mapSettings(s.settings),
    },
  };
}

// ============================================================================
// KNOWLEDGE ITEMS
// ============================================================================
export async function apiCreateItem(input: {
  title: string; content: string; summary: string;
  module: string; process: string; type: KnowledgeType;
  source?: string; tags?: string[]; priority?: Priority;
  status?: KnowledgeStatus; author?: string;
}): Promise<{ ok: true; item: KnowledgeItem } | { ok: false; error: string }> {
  const r = await call<{ item: ItemRow }>("/api/training/items", {
    method: "POST", body: JSON.stringify(input),
  });
  if (!r.ok) return r;
  return { ok: true, item: mapItem(r.data.item) };
}

export interface ItemPatch {
  title?: string; content?: string; summary?: string;
  module?: string; process?: string; type?: KnowledgeType;
  source?: string; tags?: string[]; priority?: Priority; status?: KnowledgeStatus;
  score?: number; version?: string;
  validatedBy?: string | null;
  publishedAt?: string | null;
  validationStage?: ValidationStage;
  functionalValidatedBy?: string | null;
  technicalValidatedBy?: string | null;
  rejectionReason?: string | null;
}

export async function apiUpdateItem(id: string, patch: ItemPatch): Promise<{ ok: true; item: KnowledgeItem } | { ok: false; error: string }> {
  const r = await call<{ item: ItemRow }>(`/api/training/items/${id}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
  if (!r.ok) return r;
  return { ok: true, item: mapItem(r.data.item) };
}

export async function apiDeleteItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const r = await call<unknown>(`/api/training/items/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

// ============================================================================
// Q&A
// ============================================================================
export async function apiCreateQA(items: { knowledgeItemId: string; question: string; expectedAnswer: string }[]): Promise<
  { ok: true; qa: TrainingQA[] } | { ok: false; error: string }
> {
  const r = await call<{ qa: QARow[] }>("/api/training/qa", {
    method: "POST", body: JSON.stringify({ items }),
  });
  if (!r.ok) return r;
  return { ok: true, qa: r.data.qa.map(mapQA) };
}

export async function apiUpdateQA(id: string, patch: { question?: string; expectedAnswer?: string; approved?: boolean }): Promise<{ ok: true; qa: TrainingQA } | { ok: false; error: string }> {
  const r = await call<{ qa: QARow }>(`/api/training/qa/${id}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
  if (!r.ok) return r;
  return { ok: true, qa: mapQA(r.data.qa) };
}

export async function apiDeleteQA(id: string): Promise<{ ok: boolean; error?: string }> {
  const r = await call<unknown>(`/api/training/qa/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

// ============================================================================
// VERSIONS
// ============================================================================
export async function apiCreateVersion(input: {
  version: string; description: string; createdBy: string;
  itemCount: number; validatedCount: number; publishedCount: number;
  changelog?: string[];
}): Promise<{ ok: true; version: TrainingVersion } | { ok: false; error: string }> {
  const r = await call<{ version: VersionRow }>("/api/training/versions", {
    method: "POST", body: JSON.stringify(input),
  });
  if (!r.ok) return r;
  return { ok: true, version: mapVersion(r.data.version) };
}

export async function apiSetVersionStatus(id: string, status: TrainingVersionStatus): Promise<{ ok: true; version: TrainingVersion } | { ok: false; error: string }> {
  const r = await call<{ version: VersionRow }>(`/api/training/versions/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
  if (!r.ok) return r;
  return { ok: true, version: mapVersion(r.data.version) };
}

// ============================================================================
// GAPS
// ============================================================================
export async function apiCreateGap(input: {
  title: string; description: string; module: string; process: string;
  priority: Priority; suggestedAction: string; status?: GapStatus;
}): Promise<{ ok: true; gap: KnowledgeGap } | { ok: false; error: string }> {
  const r = await call<{ gap: GapRow }>("/api/training/gaps", {
    method: "POST", body: JSON.stringify(input),
  });
  if (!r.ok) return r;
  return { ok: true, gap: mapGap(r.data.gap) };
}

export async function apiUpdateGap(id: string, patch: Partial<{
  title: string; description: string; module: string; process: string;
  priority: Priority; suggestedAction: string; status: GapStatus;
}>): Promise<{ ok: true; gap: KnowledgeGap } | { ok: false; error: string }> {
  const r = await call<{ gap: GapRow }>(`/api/training/gaps/${id}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
  if (!r.ok) return r;
  return { ok: true, gap: mapGap(r.data.gap) };
}

export async function apiDeleteGap(id: string): Promise<{ ok: boolean; error?: string }> {
  const r = await call<unknown>(`/api/training/gaps/${id}`, { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

// ============================================================================
// SETTINGS
// ============================================================================
export async function apiUpdateSettings(patch: Partial<TrainingSettings>): Promise<{ ok: true; settings: TrainingSettings } | { ok: false; error: string }> {
  const r = await call<{ settings: SettingsRow }>("/api/training/settings", {
    method: "PATCH", body: JSON.stringify(patch),
  });
  if (!r.ok) return r;
  return { ok: true, settings: mapSettings(r.data.settings) };
}

// ============================================================================
// GAP AUTO-DETECTION
// ============================================================================
export interface GapDetectionReport {
  scannedAt: string;
  candidates: number;
  created: number;
  skipped: number;
  bySource: { source: string; count: number }[];
}

export async function apiRunGapDetection(daysBack = 14): Promise<{ ok: true; report: GapDetectionReport } | { ok: false; error: string }> {
  const r = await call<{ report: GapDetectionReport }>("/api/training/gaps/detect", {
    method: "POST", body: JSON.stringify({ daysBack }),
  });
  if (!r.ok) return r;
  return { ok: true, report: r.data.report };
}

// ============================================================================
// QA EVAL — regression tests del agente contra Q&A aprobadas
// ============================================================================
export interface EvalSingleResult {
  qaId: string;
  itemId: string | null;
  question: string;
  expected: string;
  actual: string;
  score: number;
  verdict: "pass" | "partial" | "fail";
  notes: string;
  latencyMs: number;
}

export interface EvalRunReport {
  runId: string;
  totalQas: number;
  passed: number;
  failed: number;
  partial: number;
  avgScore: number;
  promptLabel: string | null;
  durationMs: number;
  results: EvalSingleResult[];
}

export interface EvalRunSummary {
  id: string;
  triggered_by: string;
  total_qas: number;
  passed: number;
  failed: number;
  avg_score: number;
  prompt_label: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface EvalRunDetail extends EvalRunSummary {
  results: EvalSingleResult[];
}

export async function apiRunQaEval(limit = 20): Promise<{ ok: true; report: EvalRunReport } | { ok: false; error: string }> {
  const r = await call<{ report: EvalRunReport }>("/api/training/eval/run", {
    method: "POST", body: JSON.stringify({ limit }),
  });
  if (!r.ok) return r;
  return { ok: true, report: r.data.report };
}

export async function apiListEvalRuns(): Promise<{ ok: true; runs: EvalRunSummary[] } | { ok: false; error: string }> {
  const r = await call<{ runs: EvalRunSummary[] }>("/api/training/eval/runs");
  if (!r.ok) return r;
  return { ok: true, runs: r.data.runs };
}

export async function apiGetEvalRunDetail(id: string): Promise<{ ok: true; run: EvalRunDetail } | { ok: false; error: string }> {
  const r = await call<{ run: EvalRunDetail }>(`/api/training/eval/runs/${id}`);
  if (!r.ok) return r;
  return { ok: true, run: r.data.run };
}
