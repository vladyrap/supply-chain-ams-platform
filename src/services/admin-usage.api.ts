// =============================================================================
// admin-usage.api.ts — Client del endpoint /api/admin/usage/summary (v0.14.13)
// =============================================================================

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export interface UsageWindow { calls: number; usd: number; clp: number }
export interface UsageDelta { pct: number; direction: "up" | "down" | "flat" }
export interface UsageModelBreakdown { model: string; calls: number; usd: number; clp: number; pctOfTotal: number }
export interface UsageDailyPoint { date: string; calls: number; usd: number; clp: number; isAnomaly: boolean }
export interface UsageHeatmapHour { hour: number; calls: number; usd: number; clp: number }
export interface UsageForecast { eomCalls: number; eomUsd: number; eomClp: number; confidence: "high" | "medium" | "low"; basedOnDays: number }
export interface UsageSavings { ifAllFlashLite: { monthUsd: number; monthClp: number; savedUsd: number; savedClp: number; savedPct: number } }
export interface UsageTopSource { source: string; calls: number; usd: number; clp: number }
export interface UsageAnomaly { date: string; usd: number; deviation: number }

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
  meta: { clpPerUsd: number; lastCallAt: string | null; tableExists: boolean; cachedAt: string; ttlSeconds: number };
}

export async function fetchAdminUsageSummary(): Promise<UsageSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/admin/usage/summary`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Genera CSV con la serie diaria. */
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
