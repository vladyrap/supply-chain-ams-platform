import { apiGet, ApiError } from "./_http";

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
    const data = await apiGet<{ success: boolean; graph?: GraphPayload; error?: string }>(`/api/graph?limit=${limit}`);
    if (!data || !data.success || !data.graph) return { ok: false, error: data?.error || "no data" };
    return { ok: true, g: data.graph };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
