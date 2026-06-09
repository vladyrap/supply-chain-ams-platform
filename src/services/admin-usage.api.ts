// =============================================================================
// admin-usage.api.ts — Client del endpoint /api/admin/usage/summary (v0.14.12)
// =============================================================================

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export interface UsageWindow {
  calls: number;
  usd: number;
  clp: number;
}

export interface UsageModelBreakdown {
  model: string;
  calls: number;
  usd: number;
  clp: number;
}

export interface UsageDailyPoint {
  date: string;
  calls: number;
  usd: number;
  clp: number;
}

export interface UsageRateLimiterStats {
  enabled: boolean;
  caps: { minute: number; hour: number; day: number };
  current: { minute: number; hour: number; day: number };
  remaining: { minute: number; hour: number; day: number };
}

export interface UsageSummaryResponse {
  success: boolean;
  totals: {
    today: UsageWindow;
    week: UsageWindow;
    month: UsageWindow;
    all: UsageWindow;
  };
  byModel: UsageModelBreakdown[];
  daily: UsageDailyPoint[];
  rateLimiter: UsageRateLimiterStats;
  meta: { clpPerUsd: number; lastCallAt: string | null; tableExists: boolean };
}

export async function fetchAdminUsageSummary(): Promise<UsageSummaryResponse> {
  const res = await fetch(`${API_BASE}/api/admin/usage/summary`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
