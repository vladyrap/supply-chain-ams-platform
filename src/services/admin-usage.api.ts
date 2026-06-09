// =============================================================================
// admin-usage.api.ts — Client del endpoint /api/admin/usage/summary (v0.14.14)
// =============================================================================

import { apiFetch } from "./_http";

export interface UsageWindow { calls: number; usd: number; clp: number }
export interface UsageDelta { pct: number; direction: "up" | "down" | "flat" }
export interface UsageModelBreakdown { model: string; calls: number; usd: number; clp: number; pctOfTotal: number }
export interface UsageDailyPoint { date: string; calls: number; usd: number; clp: number; isAnomaly: boolean }
export interface UsageHeatmapHour { hour: number; calls: number; usd: number; clp: number }
export interface UsageForecast { eomCalls: number; eomUsd: number; eomClp: number; confidence: "high" | "medium" | "low"; basedOnDays: number }
export interface UsageSavings { ifAllFlashLite: { monthUsd: number; monthClp: number; savedUsd: number; savedClp: number; savedPct: number } }
export interface UsageTopSource { source: string; calls: number; usd: number; clp: number }
export interface UsageAnomaly { date: string; usd: number; deviation: number }

export interface UsageTokens { input: number; output: number; total: number; inputUsd: number; outputUsd: number; inputPct: number; outputPct: number }
export interface UsageBurnRate { lastHourCalls: number; lastHourUsd: number; prevHourCalls: number; deltaPct: number; estimateNext24hUsd: number; estimateNext24hClp: number }
export interface UsageHistogram { bucket: string; minUsd: number; calls: number; pct: number }
export interface UsageHealthDim { name: string; score: number; weight: number; reason: string }
export interface UsageHealth { score: number; status: "excellent" | "good" | "watch" | "warning" | "critical"; dimensions: UsageHealthDim[] }
export interface UsageRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: "savings" | "performance" | "safety" | "ops";
  title: string;
  description: string;
  estimatedSavingClp?: number;
  actionable: boolean;
}
export interface UsageSameDayComparison {
  today: UsageWindow;
  sameDayLastWeek: UsageWindow & { date: string };
  delta: UsageDelta;
}

export interface UsageRateLimiterStats {
  enabled: boolean;
  caps: { minute: number; hour: number; day: number };
  current: { minute: number; hour: number; day: number };
  remaining: { minute: number; hour: number; day: number };
}

export interface UsageSummaryResponse {
  success: boolean;
  totals: { today: UsageWindow; week: UsageWindow; month: UsageWindow; all: UsageWindow };
  trends: { weekVsPrev: UsageDelta; monthVsPrev: UsageDelta };
  byModel: UsageModelBreakdown[];
  daily: UsageDailyPoint[];
  heatmap: UsageHeatmapHour[];
  forecast: UsageForecast;
  savings: UsageSavings;
  topSources: UsageTopSource[];
  anomalies: UsageAnomaly[];
  rateLimiter: UsageRateLimiterStats;
  tokens: UsageTokens;
  burnRate: UsageBurnRate;
  histogram: UsageHistogram[];
  health: UsageHealth;
  recommendations: UsageRecommendation[];
  sameDayLastWeek: UsageSameDayComparison;
  meta: { clpPerUsd: number; lastCallAt: string | null; tableExists: boolean; cachedAt: string; ttlSeconds: number; version: string };
}

export async function fetchAdminUsageSummary(signal?: AbortSignal): Promise<UsageSummaryResponse> {
  return apiFetch<UsageSummaryResponse>("/api/admin/usage/summary", { signal });
}

export function dailyToCsv(daily: UsageDailyPoint[]): string {
  const header = "fecha,calls,usd,clp,anomaly";
  const rows = daily.map((d) => `${d.date},${d.calls},${d.usd.toFixed(6)},${d.clp},${d.isAnomaly ? "yes" : "no"}`);
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
