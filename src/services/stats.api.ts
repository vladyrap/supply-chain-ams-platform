const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

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
    const res = await fetch(`${API_BASE}/api/ams/stats`, { cache: "no-store", credentials: "include" });
    const data = (await res.json().catch(() => null)) as { success: boolean; stats?: AmsStats; error?: string } | null;
    if (!data || !data.success || !data.stats) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, stats: data.stats };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
