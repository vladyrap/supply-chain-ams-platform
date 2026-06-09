import { apiGet, ApiError } from "./_http";

export interface StatsByKey { key: string; count: number }
export interface StatsByDay { day: string; count: number }
export interface StatsByConfidence { confidence: string; count: number }

export interface AmsStats {
  totalIncidents: number;
  incidentsLast7d: number;
  incidentsToday: number;
  withAttachments: number;
  byModule: StatsByKey[];
  byEnvironment: StatsByKey[];
  byConfidence: StatsByConfidence[];
  byDay: StatsByDay[];
  recentAudit: { action: string; created_at: string }[];
}

export async function fetchStats(): Promise<{ ok: true; stats: AmsStats } | { ok: false; error: string }> {
  try {
    const data = await apiGet<{ success: boolean; stats?: AmsStats; error?: string }>("/api/ams/stats");
    if (!data || !data.success || !data.stats) {
      return { ok: false, error: data?.error || "no data" };
    }
    return { ok: true, stats: data.stats };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
