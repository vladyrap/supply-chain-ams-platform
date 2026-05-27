"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import KPI from "@/components/ui/KPI";
import { usePlatform } from "@/context/PlatformContext";
import {
  ingestDocument,
  listKnowledgeDocuments,
  deleteKnowledgeDocument,
  fetchKnowledgeOverview,
  type KnowledgeDocument,
  type KnowledgeStats,
} from "@/services/knowledge.api";
import type { SapModule } from "@/types";

const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/markdown",
  "text/plain",
]);
const MAX_BYTES = 15 * 1024 * 1024;

const SAP_MODULES: SapModule[] = [
  "NO_INFORMADO", "MM", "SD", "PP", "WM", "EWM",
  "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION",
];

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadge(s: KnowledgeDocument["status"]) {
  if (s === "indexed") return <Badge variant="ok">indexado</Badge>;
  if (s === "error") return <Badge variant="error">error</Badge>;
  if (s === "processing") return <Badge variant="warn">procesando…</Badge>;
  return <Badge variant="info">en cola</Badge>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === "string" ? r.result : "";
      const c = s.indexOf(",");
      resolve(c >= 0 ? s.slice(c + 1) : s);
    };
    r.onerror = () => reject(r.error ?? new Error("read error"));
    r.readAsDataURL(file);
  });
}

export default function KnowledgePage() {
  const { client } = usePlatform();

  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [chosenModule, setChosenModule] = useState<SapModule>("NO_INFORMADO");
  const [chosenTitle, setChosenTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [docsRes, statsRes] = await Promise.all([
      listKnowledgeDocuments({}),
      fetchKnowledgeOverview(),
    ]);
    if (docsRes.ok) setDocs(docsRes.documents);
    else            setError(docsRes.error);
    if (statsRes.ok) setStats(statsRes.stats);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh suave mientras haya docs en pending/processing
  useEffect(() => {
    const inFlight = docs.some((d) => d.status === "pending" || d.status === "processing");
    if (!inFlight) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [docs, refresh]);

  async function handleFiles(fileList: FileList | null) {
    setUploadError(null);
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        // Algunos navegadores no setean mimeType bien para .md/.txt; mapeamos
        let mime = file.type;
        const lower = file.name.toLowerCase();
        if (!mime || mime === "application/octet-stream") {
          if (lower.endsWith(".md")) mime = "text/markdown";
          else if (lower.endsWith(".txt")) mime = "text/plain";
        }
        if (!ALLOWED_MIME.has(mime)) {
          setUploadError(`"${file.name}": formato no soportado (${mime || "desconocido"}). Acepta PDF, DOCX, XLSX, MD, TXT.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setUploadError(`"${file.name}" supera el máximo de ${MAX_BYTES / (1024 * 1024)} MB.`);
          continue;
        }
        const b64 = await fileToBase64(file);
        const res = await ingestDocument({
          fileName: file.name,
          mimeType: mime,
          dataBase64: b64,
          title: chosenTitle || undefined,
          module: chosenModule === "NO_INFORMADO" ? undefined : chosenModule,
          client: client || undefined,
        });
        if (!res.ok) {
          setUploadError(`"${file.name}": ${res.error}`);
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      setChosenTitle("");
      await refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: KnowledgeDocument) {
    if (!confirm(`¿Eliminar "${doc.title ?? doc.source_file}" y todos sus chunks?`)) return;
    const res = await deleteKnowledgeDocument(doc.id);
    if (!res.ok) {
      alert(`No pude borrar: ${res.error}`);
      return;
    }
    await refresh();
  }

  return (
    <div>
      <div className="page-title">
        <h1>📚 Conocimiento</h1>
        <p>
          Sube PDF, DOCX, XLSX, MD o TXT. Los archivos se procesan en background (extract → chunk → embedding) y se hacen disponibles para que el Agente AMS use el contenido como contexto en sus respuestas.
        </p>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <a href="/knowledge/graph" className="btn" style={{ textDecoration: "none" }}>
          🌳 Ver Knowledge Graph
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KPI label="Documentos" value={stats ? stats.documents : "—"} accent="info" />
        <KPI label="Indexados" value={stats ? stats.documentsIndexed : "—"} accent="ok" />
        <KPI label="En cola" value={stats ? stats.documentsPending : "—"} accent="warn" />
        <KPI label="Chunks" value={stats ? stats.chunks : "—"} accent="tech" hint={`~${stats?.totalTokens ?? 0} tokens`} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Subir documento</h3>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lab">Título (opcional)</label>
            <input value={chosenTitle} onChange={(e) => setChosenTitle(e.target.value)} placeholder="Blueprint MM v2 — Cliente Demo" />
          </div>
          <div style={{ width: 160 }}>
            <label className="lab">Módulo SAP</label>
            <select value={chosenModule} onChange={(e) => setChosenModule(e.target.value as SapModule)}>
              {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/markdown,text/plain"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
            style={{ display: "none" }}
            id="kn-input"
          />
          <label htmlFor="kn-input" className={`btn primary`} style={{ cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? <><span className="spinner" /> Subiendo…</> : "📤 Elegir archivo(s)"}
          </label>
        </div>
        {uploadError && <div className="alert error" style={{ marginTop: 10 }}>{uploadError}</div>}
        <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 10 }}>
          Formatos: PDF, DOCX, XLSX, MD, TXT · máx {MAX_BYTES / (1024 * 1024)} MB por archivo.
          La indexación demora algunos segundos (depende del tamaño y del rate limit de embeddings).
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Documentos cargados</h3>
          <button className="btn ghost" onClick={refresh} disabled={loading}>
            {loading ? <><span className="spinner" /> actualizando</> : "↻ Refrescar"}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        {docs.length === 0 && !loading && (
          <div style={{ color: "var(--text-dim)", fontSize: 13.5 }}>
            Aún no has subido ningún documento. Cuando subas el primero, el Agente AMS empezará a usarlo como contexto automáticamente.
          </div>
        )}

        {docs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", textAlign: "left" }}>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Documento</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Tipo</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Módulo</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Tamaño</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Chunks</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Estado</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}>Subido</th>
                  <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border-soft)" }}></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ fontWeight: 500 }}>{d.title ?? d.source_file}</div>
                      {d.error_message && (
                        <div style={{ fontSize: 11.5, color: "var(--error)", marginTop: 2 }} title={d.error_message}>
                          {d.error_message.slice(0, 100)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <Badge variant="muted">{d.source_type ?? "—"}</Badge>
                    </td>
                    <td style={{ padding: "10px 6px" }}>{d.module ?? "—"}</td>
                    <td style={{ padding: "10px 6px", color: "var(--text-soft)" }}>{formatSize(d.size_bytes)}</td>
                    <td style={{ padding: "10px 6px", fontVariantNumeric: "tabular-nums" }}>{d.chunk_count}</td>
                    <td style={{ padding: "10px 6px" }}>{statusBadge(d.status)}</td>
                    <td style={{ padding: "10px 6px", color: "var(--text-soft)", fontSize: 11.5 }}>
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <button className="btn danger" onClick={() => handleDelete(d)} aria-label={`Eliminar ${d.title ?? d.source_file}`}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="alert info" style={{ marginTop: 14 }}>
        <b>Cómo funciona:</b> cada vez que envíes una consulta al Agente AMS, el backend hace una búsqueda vectorial (pgvector) sobre los chunks indexados. Si encuentra fragmentos con similitud alta, se inyectan como <code>[CONTEXTO RAG]</code> en el system message para que el agente cite las fuentes en sus respuestas. Si no hay matches, responde con conocimiento general (sin citar fuentes inventadas).
      </div>
    </div>
  );
}
