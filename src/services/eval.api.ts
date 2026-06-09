import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

export type ConfidenceLevel = "alta" | "media" | "baja" | "no_detectada";

export interface EvalConfig {
  label: string;
  model: string;
  temperature?: number;
}

export interface EvalQuestion {
  text: string;
  expected_module?: string;
}

export interface EvalSummary {
  total: number;
  ok: number;
  errors: number;
  quotaErrors: number;
  avgLatencyMs: number;
  pct12Blocks: number;
  confidenceDist: Record<ConfidenceLevel, number>;
}

export interface EvalRun {
  id: string;
  name: string;
  config_label: string;
  config: EvalConfig;
  status: "pending" | "running" | "done" | "failed";
  total: number;
  completed: number;
  summary: EvalSummary | null;
  created_at: string;
  updated_at: string;
}

export interface EvalResult {
  id: string;
  run_id: string;
  config_label: string;
  question: string;
  expected_module: string | null;
  response: string | null;
  confidence: ConfidenceLevel | null;
  latency_ms: number | null;
  has_12_blocks: boolean | null;
  status: "pending" | "ok" | "error" | "quota_error";
  error: string | null;
  created_at: string;
}

async function call<T>(path: string, opts?: ApiFetchOptions): Promise<T | { success: false; error: string }> {
  try {
    const data = await apiFetch<T>(path, opts);
    if (data === null || data === undefined) return { success: false, error: "no data" } as { success: false; error: string };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export const evalApi = {
  create: (name: string, configs: EvalConfig[], questions: EvalQuestion[]) =>
    call<{ success: true; runIds: string[] }>("/api/eval/runs", {
      method: "POST",
      body: { name, configs, questions },
    }),
  list: () => call<{ success: true; count: number; runs: EvalRun[] }>("/api/eval/runs"),
  detail: (id: string) =>
    call<{ success: true; run: EvalRun; results: EvalResult[] }>(`/api/eval/runs/${id}`),
};
