// Cliente del backend para Playbooks, Document Factory, Quality Evaluator.
// Una sola API para los 3 módulos chicos.

import type {
  AmsPlaybook, PlaybookExecution, GeneratedDocument, AgentEvaluation,
} from "@/types/ams-modules";
import { apiFetch, type ApiFetchOptions } from "./_http";

async function http<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, opts);
}

// ============================================================
// Playbooks
// ============================================================
export interface PlaybooksSnapshot {
  playbooks: AmsPlaybook[];
  executions: PlaybookExecution[];
}
export const playbooksApi = {
  async getSnapshot(): Promise<PlaybooksSnapshot> {
    const d = await http<{ success: true } & PlaybooksSnapshot>("/api/playbooks/snapshot");
    return { playbooks: d.playbooks || [], executions: d.executions || [] };
  },
  async upsertPlaybook(p: AmsPlaybook): Promise<AmsPlaybook> {
    const r = await http<{ success: true; playbook: AmsPlaybook }>("/api/playbooks", { method: "POST", body: p });
    return r.playbook;
  },
  async deletePlaybook(id: string): Promise<void> {
    await http(`/api/playbooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async upsertExecution(e: PlaybookExecution): Promise<PlaybookExecution> {
    const r = await http<{ success: true; execution: PlaybookExecution }>("/api/playbooks/executions", { method: "POST", body: e });
    return r.execution;
  },
  async deleteExecution(id: string): Promise<void> {
    await http(`/api/playbooks/executions/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async resetDemo(): Promise<PlaybooksSnapshot> {
    const d = await http<{ success: true } & PlaybooksSnapshot>("/api/playbooks/reset-demo", { method: "POST" });
    return { playbooks: d.playbooks || [], executions: d.executions || [] };
  },
};

// ============================================================
// Documents
// ============================================================
export interface DocumentsSnapshot { documents: GeneratedDocument[] }
export const documentsApi = {
  async getSnapshot(): Promise<DocumentsSnapshot> {
    const d = await http<{ success: true } & DocumentsSnapshot>("/api/documents/snapshot");
    return { documents: d.documents || [] };
  },
  async upsertDocument(doc: GeneratedDocument): Promise<GeneratedDocument> {
    const r = await http<{ success: true; document: GeneratedDocument }>("/api/documents", { method: "POST", body: doc });
    return r.document;
  },
  async deleteDocument(id: string): Promise<void> {
    await http(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async resetDemo(): Promise<DocumentsSnapshot> {
    const d = await http<{ success: true } & DocumentsSnapshot>("/api/documents/reset-demo", { method: "POST" });
    return { documents: d.documents || [] };
  },
};

// ============================================================
// Quality
// ============================================================
export interface QualitySnapshot { evaluations: AgentEvaluation[] }
export const qualityApi = {
  async getSnapshot(): Promise<QualitySnapshot> {
    const d = await http<{ success: true } & QualitySnapshot>("/api/quality/snapshot");
    return { evaluations: d.evaluations || [] };
  },
  async upsertEvaluation(e: AgentEvaluation): Promise<AgentEvaluation> {
    const r = await http<{ success: true; evaluation: AgentEvaluation }>("/api/quality/evaluations", { method: "POST", body: e });
    return r.evaluation;
  },
  async deleteEvaluation(id: string): Promise<void> {
    await http(`/api/quality/evaluations/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async resetDemo(): Promise<QualitySnapshot> {
    const d = await http<{ success: true } & QualitySnapshot>("/api/quality/reset-demo", { method: "POST" });
    return { evaluations: d.evaluations || [] };
  },
};
