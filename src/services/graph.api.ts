const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

export type GraphNodeType = "incident" | "ticket" | "conversation" | "kb" | "meeting";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  subtitle?: string;
  href?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "escalated" | "uses_kb" | "kb_from" | "linked";
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  counts: Record<GraphNodeType, number>;
}

export async function fetchGraph(limit = 30): Promise<{ ok: true; g: GraphPayload } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/graph?limit=${limit}`, { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { success: boolean; graph?: GraphPayload; error?: string } | null;
    if (!data || !data.success || !data.graph) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, g: data.graph };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
