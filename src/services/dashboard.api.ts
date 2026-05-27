const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export interface DashboardAdvanced {
  totals: {
    incidents: number;
    incidentsToday: number;
    incidentsLast7d: number;
    incidentsWithAttachments: number;
    supportConversations: number;
    supportConversationsOpen: number;
    aiResolvedRate: number;
    supportTicketsActive: number;
    supportTicketsSlaBreaches: number;
    meetingsDone: number;
    kbApproved: number;
  };
  heatmap: { day: number; hour: number; value: number }[];
  byModule: { key: string; count: number }[];
  byConfidence: { key: string; count: number }[];
  byUrgency: { key: string; count: number }[];
  sla: { inSla: number; breaching: number; okPct: number };
  topUsers: { name: string; count: number }[];
  topSystems: { key: string; count: number }[];
  timeline: { day: string; incidents: number; tickets: number; meetings: number }[];
}

export interface DashboardExecutive {
  period: { from: string; to: string; days: number };
  kpis: {
    totalInteractions: number;
    incidentsMonth: number;
    ticketsResolvedMonth: number;
    aiResolutionRate: number;
    slaCompliancePct: number;
    avgResponseTimeMin: number;
    kbArticlesCreated: number;
    estimatedCostUsd: number;
    costPerInteractionUsd: number;
  };
  byClient: { name: string; incidents: number; tickets: number; total: number }[];
  byModule: { key: string; count: number }[];
  trend: { day: string; interactions: number }[];
  topAgents: { name: string; resolved: number }[];
}

export interface UsageSummary {
  period: { from: string; to: string; days: number };
  totals: { calls: number; promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number };
  byModel:  { model: string;  calls: number; tokens: number; costUsd: number }[];
  bySource: { source: string; calls: number; tokens: number; costUsd: number }[];
  byDay:    { day: string;    calls: number; tokens: number; costUsd: number }[];
}

export async function fetchUsage(days = 30): Promise<{ ok: true; u: UsageSummary } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/usage?days=${days}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { success: boolean; usage?: UsageSummary; error?: string } | null;
    if (!data || !data.success || !data.usage) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, u: data.usage };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchExecutive(days = 30): Promise<{ ok: true; d: DashboardExecutive } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/executive?days=${days}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { success: boolean; dashboard?: DashboardExecutive; error?: string } | null;
    if (!data || !data.success || !data.dashboard) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, d: data.dashboard };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function fetchAdvanced(): Promise<{ ok: true; d: DashboardAdvanced } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/advanced`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { success: boolean; dashboard?: DashboardAdvanced; error?: string } | null;
    if (!data || !data.success || !data.dashboard) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, d: data.dashboard };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export interface NotificationItem {
  id: string;
  kind: "ticket_escalated" | "ticket_resolved" | "kb_approved" | "meeting_done" | "incident_created";
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  createdAt: string;
}

export async function fetchNotifications(since?: string): Promise<{ ok: true; items: NotificationItem[] } | { ok: false; error: string }> {
  try {
    const params = new URLSearchParams();
    if (since) params.set("since", since);
    const res = await fetch(`${API_BASE}/api/notifications?${params}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { success: boolean; notifications?: NotificationItem[]; error?: string } | null;
    if (!data || !data.success || !data.notifications) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, items: data.notifications };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
