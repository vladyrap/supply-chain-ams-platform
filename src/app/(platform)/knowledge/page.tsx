"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePlatform } from "@/context/PlatformContext";
import {
  ingestDocument, ingestText, ingestUrl,
  listKnowledgeDocuments, deleteKnowledgeDocument, fetchKnowledgeOverview,
  fetchDocumentChunks, searchKnowledge,
  type KnowledgeDocument, type KnowledgeStats, type KnowledgeChunk, type RagSearchHit,
} from "@/services/knowledge.api";
import type { SapModule } from "@/types";
import RequirePermission from "@/components/admin/RequirePermission";

type Tab = "docs" | "playground" | "quick";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "docs",       label: "Documentos",     icon: "📚" },
  { id: "playground", label: "RAG Playground", icon: "🔬" },
  { id: "quick",      label: "Quick-add",      icon: "📋" },
];

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

const TYPE_META: Record<string, { color: string; icon: string }> = {
  pdf:  { color: "#ef4444", icon: "📕" },
  docx: { color: "#3b82f6", icon: "📘" },
  xlsx: { color: "#10b981", icon: "📗" },
  md:   { color: "#a855f7", icon: "📝" },
  txt:  { color: "#6b7280", icon: "📄" },
  unknown: { color: "#94a3b8", icon: "📎" },
};

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

function KnowledgePageInner() {
  const [tab, setTab] = useState<Tab>("docs");
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [docsRes, statsRes] = await Promise.all([
      listKnowledgeDocuments({}),
      fetchKnowledgeOverview(),
    ]);
    if (docsRes.ok) setDocs(docsRes.documents);
    else setError(docsRes.error);
    if (statsRes.ok) setStats(statsRes.stats);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh suave si hay pending
  useEffect(() => {
    const inFlight = docs.some((d) => d.status === "pending" || d.status === "processing");
    if (!inFlight) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [docs, refresh]);

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>KNOWLEDGE · RAG · INGEST</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>📚 Conocimiento</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Alimentá la IA con documentos, texto pegado o URLs. Probá en vivo qué chunks recupera el agente antes de mandar una consulta real.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#22d3ee" }}>
              <div className="kanban-stat-val">{stats?.documents ?? 0}</div>
              <div className="kanban-stat-lbl">DOCS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats?.documentsIndexed ?? 0}</div>
              <div className="kanban-stat-lbl">INDEXADOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#fbbf24" }}>
              <div className="kanban-stat-val">{stats?.documentsPending ?? 0}</div>
              <div className="kanban-stat-lbl">EN COLA</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{(stats?.chunks ?? 0).toLocaleString()}</div>
              <div className="kanban-stat-lbl">CHUNKS</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="row" style={{ gap: 4, marginTop: 14, position: "relative", zIndex: 2 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`kn-tab ${tab === t.id ? "active" : ""}`}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
          <Link href="/knowledge/training" className="btn primary" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }}>
            🎓 Entrenamiento IA
          </Link>
          <Link href="/knowledge/graph" className="btn ghost" style={{ padding: "5px 12px", fontSize: 12 }}>
            🌳 Knowledge Graph
          </Link>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ padding: "5px 12px", fontSize: 12 }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻"}
          </button>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      {tab === "docs"       && <DocsTab docs={docs} loading={loading} stats={stats} onRefresh={refresh} />}
      {tab === "playground" && <PlaygroundTab />}
      {tab === "quick"      && <QuickAddTab onRefresh={refresh} />}
    </div>
  );
}

// ============================================================================
// DOCS TAB — drag&drop + cards
// ============================================================================
function DocsTab({ docs, loading, stats, onRefresh }: {
  docs: KnowledgeDocument[]; loading: boolean; stats: KnowledgeStats | null; onRefresh: () => Promise<void>;
}) {
  const { client } = usePlatform();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progressList, setProgressList] = useState<{ name: string; state: "uploading" | "ok" | "error"; error?: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [chosenModule, setChosenModule] = useState<SapModule>("NO_INFORMADO");
  const [chosenTitle, setChosenTitle] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chunksModal, setChunksModal] = useState<{ doc: KnowledgeDocument; chunks: KnowledgeChunk[] | null; loading: boolean } | null>(null);

  async function handleFiles(fileList: FileList | null) {
    setUploadError(null);
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const initial = Array.from(fileList).map((f) => ({ name: f.name, state: "uploading" as const }));
    setProgressList(initial);

    try {
      const files = Array.from(fileList);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let mime = file.type;
        const lower = file.name.toLowerCase();
        if (!mime || mime === "application/octet-stream") {
          if (lower.endsWith(".md")) mime = "text/markdown";
          else if (lower.endsWith(".txt")) mime = "text/plain";
        }
        if (!ALLOWED_MIME.has(mime)) {
          setProgressList((p) => p.map((x, j) => j === i ? { ...x, state: "error", error: `formato no soportado (${mime || "desconocido"})` } : x));
          continue;
        }
        if (file.size > MAX_BYTES) {
          setProgressList((p) => p.map((x, j) => j === i ? { ...x, state: "error", error: `supera ${MAX_BYTES / (1024 * 1024)} MB` } : x));
          continue;
        }
        try {
          const b64 = await fileToBase64(file);
          const res = await ingestDocument({
            fileName: file.name, mimeType: mime, dataBase64: b64,
            title: chosenTitle || undefined,
            module: chosenModule === "NO_INFORMADO" ? undefined : chosenModule,
            client: client || undefined,
          });
          if (!res.ok) {
            setProgressList((p) => p.map((x, j) => j === i ? { ...x, state: "error", error: res.error } : x));
          } else {
            setProgressList((p) => p.map((x, j) => j === i ? { ...x, state: "ok" } : x));
          }
        } catch (err) {
          setProgressList((p) => p.map((x, j) => j === i ? { ...x, state: "error", error: err instanceof Error ? err.message : "error" } : x));
        }
      }
      if (inputRef.current) inputRef.current.value = "";
      setChosenTitle("");
      await onRefresh();
      setTimeout(() => setProgressList([]), 3000);
    } finally {
      setUploading(false);
    }
  }

  function onDrag(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  async function handleDelete(doc: KnowledgeDocument) {
    if (!confirm(`¿Eliminar "${doc.title ?? doc.source_file}" y todos sus chunks?`)) return;
    const res = await deleteKnowledgeDocument(doc.id);
    if (!res.ok) { alert(`No pude borrar: ${res.error}`); return; }
    await onRefresh();
  }

  async function openChunks(doc: KnowledgeDocument) {
    setChunksModal({ doc, chunks: null, loading: true });
    const r = await fetchDocumentChunks(doc.id);
    if (r.ok) setChunksModal({ doc, chunks: r.chunks, loading: false });
    else      setChunksModal({ doc, chunks: [], loading: false });
  }

  const distinctModules = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.module) set.add(d.module); });
    return Array.from(set).sort();
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (moduleFilter !== "all" && d.module !== moduleFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [docs, moduleFilter, statusFilter]);

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Drag & drop zone */}
      <div className={`kn-dropzone ${dragActive ? "active" : ""} ${uploading ? "uploading" : ""}`}
        onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        onClick={() => inputRef.current?.click()}>
        <div className="kn-dropzone-icon">{dragActive ? "📥" : uploading ? "⚙" : "📤"}</div>
        <div className="kn-dropzone-title">
          {dragActive ? "Soltá los archivos para subir"
            : uploading ? "Procesando…"
            : "Arrastra archivos aquí o click para elegir"}
        </div>
        <div className="kn-dropzone-sub">
          PDF · DOCX · XLSX · MD · TXT · máx {MAX_BYTES / (1024 * 1024)} MB · multi-archivo
        </div>
        <input
          ref={inputRef} type="file" multiple
          accept=".pdf,.docx,.xlsx,.md,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/markdown,text/plain"
          onChange={(e) => handleFiles(e.target.files)} disabled={uploading}
          style={{ display: "none" }}
        />
      </div>

      {/* Metadata pre-upload */}
      <div className="card">
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="settings-label">Título (opcional, se aplica al próximo upload)</label>
            <input value={chosenTitle} onChange={(e) => setChosenTitle(e.target.value)} placeholder="Blueprint MM v2 — Cliente Demo" />
          </div>
          <div style={{ width: 180 }}>
            <label className="settings-label">Módulo SAP</label>
            <select value={chosenModule} onChange={(e) => setChosenModule(e.target.value as SapModule)}>
              {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {uploadError && <div className="alert error" style={{ marginTop: 10 }}>{uploadError}</div>}

        {/* Progress list */}
        {progressList.length > 0 && (
          <div className="kn-progress-list">
            {progressList.map((p, i) => (
              <div key={i} className={`kn-progress-row ${p.state}`}>
                <span style={{ fontSize: 14 }}>
                  {p.state === "uploading" ? <span className="spinner" /> : p.state === "ok" ? "✓" : "✗"}
                </span>
                <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                {p.error && <span style={{ fontSize: 11, color: "#fca5a5" }}>{p.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="all">Todos los módulos ({docs.length})</option>
          {distinctModules.map((m) => <option key={m} value={m}>{m} ({docs.filter((d) => d.module === m).length})</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="all">Todos los estados</option>
          <option value="indexed">✓ indexados ({docs.filter((d) => d.status === "indexed").length})</option>
          <option value="processing">⏳ procesando ({docs.filter((d) => d.status === "processing").length})</option>
          <option value="pending">🕓 en cola ({docs.filter((d) => d.status === "pending").length})</option>
          <option value="error">✗ con error ({docs.filter((d) => d.status === "error").length})</option>
        </select>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)", marginLeft: "auto" }}>
          {filteredDocs.length} de {docs.length} documentos
        </span>
      </div>

      {/* Cards grid */}
      {filteredDocs.length === 0 && !loading ? (
        <div className="ticket-empty">
          <div style={{ fontSize: 44, marginBottom: 8 }}>📚</div>
          <div style={{ fontSize: 14 }}>
            {docs.length === 0
              ? "Aún no subiste documentos. Arrastrá uno arriba o usá Quick-add."
              : "Ningún documento con los filtros actuales."}
          </div>
        </div>
      ) : (
        <div className="kn-grid">
          {filteredDocs.map((d) => {
            const meta = TYPE_META[d.source_type || "unknown"] ?? TYPE_META.unknown;
            const statusColor = d.status === "indexed" ? "#10b981"
                              : d.status === "processing" ? "#fbbf24"
                              : d.status === "pending" ? "#22d3ee"
                              : "#ef4444";
            return (
              <div key={d.id} className="kn-card" style={{ ["--type-color" as never]: meta.color }}>
                <div className="kn-card-head">
                  <div className="kn-card-icon" style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="kn-card-title" title={d.title ?? d.source_file ?? ""}>{d.title ?? d.source_file ?? "—"}</div>
                    <div className="kn-card-sub">{d.source_file}</div>
                  </div>
                  <span className="kn-card-status" style={{ color: statusColor, borderColor: `${statusColor}55`, background: `${statusColor}11` }}>
                    {d.status === "indexed" ? "✓ indexado"
                      : d.status === "processing" ? "⏳ procesando"
                      : d.status === "pending" ? "🕓 en cola"
                      : "✗ error"}
                  </span>
                </div>

                {d.error_message && (
                  <div className="kn-card-error" title={d.error_message}>
                    ⚠ {d.error_message.slice(0, 120)}
                  </div>
                )}

                <div className="kn-card-stats">
                  <div><span>CHUNKS</span><b>{d.chunk_count}</b></div>
                  <div><span>TOKENS</span><b>{d.total_tokens.toLocaleString()}</b></div>
                  <div><span>TAMAÑO</span><b>{formatSize(d.size_bytes)}</b></div>
                </div>

                <div className="row" style={{ gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  {d.module && d.module !== "NO_INFORMADO" && (
                    <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>{d.module}</span>
                  )}
                  {d.client && (
                    <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#c084fc", background: "rgba(168,85,247,0.08)" }}>cliente {d.client}</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  <button className="btn ghost" onClick={() => openChunks(d)} style={{ flex: 1, fontSize: 11.5, padding: "5px 8px" }}
                    disabled={d.status !== "indexed"}>
                    🔍 ver chunks ({d.chunk_count})
                  </button>
                  <button className="btn ghost" onClick={() => handleDelete(d)} title="Eliminar" style={{ padding: "5px 10px", fontSize: 13, color: "#ef4444" }}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal chunks */}
      {chunksModal && <ChunksModal data={chunksModal} onClose={() => setChunksModal(null)} />}

      <div className="alert info" style={{ fontSize: 12 }}>
        <b>Cómo funciona:</b> al enviar una consulta al agente, el backend embedea la pregunta y busca los top-6 chunks
        más similares (cosine distance ≥ 0.55) en pgvector. Esos chunks se inyectan como <code>[CONTEXTO RAG]</code>
        en el system message. Probá la calidad en el tab <b>RAG Playground</b>.
      </div>
    </div>
  );
}

// ============================================================================
// PLAYGROUND TAB — probar RAG en vivo
// ============================================================================
function PlaygroundTab() {
  const { client } = usePlatform();
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<SapModule>("NO_INFORMADO");
  const [clientFilter, setClientFilter] = useState("");
  const [results, setResults] = useState<RagSearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const samples = [
    "¿Cómo extiendo un material a un nuevo centro en MM?",
    "Error M8 077 al cerrar período en MM",
    "El job de MRP no genera órdenes planificadas para un material",
    "Determinación de precio no funciona en pedido de venta",
  ];

  async function search() {
    if (query.trim().length < 3) {
      setSearchError("La consulta debe tener al menos 3 caracteres");
      return;
    }
    setSearching(true);
    setSearchError(null);
    const r = await searchKnowledge(query.trim(), {
      module: moduleFilter !== "NO_INFORMADO" ? moduleFilter : undefined,
      client: clientFilter.trim() || undefined,
    });
    setSearching(false);
    if (r.ok) {
      setResults(r.chunks);
      setLastQuery(r.query);
    } else {
      setSearchError(r.error);
      setResults(null);
    }
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🔬</span> PROBAR RAG · QUE VE LA IA
        </div>
        <p className="settings-section-desc">
          Escribe una pregunta como la haría un usuario real. Vas a ver EXACTAMENTE qué chunks recupera el agente
          y con qué score. Si el top no es relevante, sabés que tenés que mejorar la base de conocimiento.
        </p>

        <div className="col" style={{ gap: 8 }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: el material XYZ no aparece en MD04 del centro 1100..."
            style={{ minHeight: 70, fontSize: 13.5 }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) search(); }}
          />
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value as SapModule)} style={{ minWidth: 160 }}>
              {SAP_MODULES.map((m) => <option key={m} value={m}>Módulo: {m}</option>)}
            </select>
            <input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder={`Cliente (vacío = ${client || "todos"})`} style={{ flex: 1, minWidth: 180 }} />
            <button className="btn primary" onClick={search} disabled={searching || query.trim().length < 3}>
              {searching ? <><span className="spinner" /> buscando…</> : "🔍 Buscar (Ctrl+Enter)"}
            </button>
          </div>
        </div>

        {/* Sample queries */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.5, marginBottom: 6 }}>SAMPLES RÁPIDOS</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {samples.map((s) => (
              <button key={s} className="voice-phrase" onClick={() => setQuery(s)} style={{ flex: "1 0 auto", padding: "6px 10px" }}>
                <div style={{ fontSize: 11.5 }}>{s}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {searchError && <div className="alert error">{searchError}</div>}

      {/* Results */}
      {results !== null && (
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="ticket-section-head" style={{ margin: 0 }}>
              <span style={{ color: "var(--accent)" }}>▸</span> RESULTADOS · {results.length} chunks
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              query: <code style={{ color: "var(--accent)" }}>{lastQuery}</code>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="ticket-empty">
              <div style={{ fontSize: 36, marginBottom: 6 }}>🚫</div>
              <div style={{ fontSize: 13.5 }}>
                Ningún chunk superó el score mínimo. El agente responderá con conocimiento general, sin citar fuentes.
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
                Sugerencia: subí documentos con info más relacionada a este tema o usá Quick-add para pegar notas rápidas.
              </div>
            </div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {results.map((c, i) => (
                <div key={c.id} className="rag-chunk">
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <div className="row" style={{ gap: 6, alignItems: "center" }}>
                      <span className="rag-rank">#{i + 1}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.title}</span>
                      <span className="kanban-tag" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-dim)" }}>{c.sourceType}</span>
                      <span className="kanban-tag" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-dim)" }}>chunk {c.chunkIndex}</span>
                      {c.module && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(34,211,238,0.4)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>{c.module}</span>
                      )}
                    </div>
                    <ScoreBar score={c.score} />
                  </div>
                  <div className="rag-chunk-text">{c.content}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6, fontFamily: "var(--font-mono, monospace)" }}>
                    📄 {c.sourceFile}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score * 100));
  const color = score >= 0.75 ? "#10b981" : score >= 0.65 ? "#22d3ee" : "#fbbf24";
  return (
    <div className="rag-score">
      <div style={{ fontSize: 13, fontWeight: 700, color, textShadow: `0 0 6px ${color}`, fontFamily: "var(--font-mono, monospace)" }}>
        {score.toFixed(3)}
      </div>
      <div className="rag-score-bar"><div className="rag-score-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}` }} /></div>
    </div>
  );
}

// ============================================================================
// QUICK-ADD TAB — pegar texto sin archivo
// ============================================================================
function QuickAddTab({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { client } = usePlatform();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mod, setMod] = useState<SapModule>("NO_INFORMADO");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // URL ingest state
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlMod, setUrlMod] = useState<SapModule>("NO_INFORMADO");
  const [urlSubmitting, setUrlSubmitting] = useState(false);
  const [urlResult, setUrlResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function submit() {
    setResult(null);
    if (content.trim().length < 20) {
      setResult({ ok: false, msg: "El contenido debe tener al menos 20 caracteres" });
      return;
    }
    setSubmitting(true);
    const r = await ingestText({
      title: title.trim() || undefined,
      content,
      module: mod !== "NO_INFORMADO" ? mod : undefined,
      client: client || undefined,
    });
    setSubmitting(false);
    if (r.ok) {
      setResult({ ok: true, msg: `✓ Indexando "${r.document.title}" (${r.document.id.slice(0, 8)}). Aparecerá en Documentos en pocos segundos.` });
      setTitle(""); setContent("");
      await onRefresh();
    } else {
      setResult({ ok: false, msg: r.error });
    }
  }

  async function submitUrl() {
    setUrlResult(null);
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) {
      setUrlResult({ ok: false, msg: "Ingresá una URL http(s) válida" });
      return;
    }
    setUrlSubmitting(true);
    const r = await ingestUrl({
      url: u,
      title: urlTitle.trim() || undefined,
      module: urlMod !== "NO_INFORMADO" ? urlMod : undefined,
      client: client || undefined,
    });
    setUrlSubmitting(false);
    if (r.ok) {
      setUrlResult({ ok: true, msg: `✓ Descargado e indexando "${r.document.title}" (${r.document.id.slice(0, 8)}). Aparecerá en Documentos en pocos segundos.` });
      setUrl(""); setUrlTitle("");
      await onRefresh();
    } else {
      setUrlResult({ ok: false, msg: r.error });
    }
  }

  const chars = content.length;
  const maxChars = 500000;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>📋</span> QUICK-ADD · TEXTO PEGADO
        </div>
        <p className="settings-section-desc">
          Pegá texto directo sin subir archivo. Ideal para notas internas, transcripciones de reuniones,
          extractos de emails o procedimientos manuales. Se indexa igual que un documento normal.
        </p>

        <div className="col" style={{ gap: 10 }}>
          <div>
            <label className="settings-label">Título (opcional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Procedimiento para extender material" />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div style={{ width: 200 }}>
              <label className="settings-label">Módulo SAP</label>
              <select value={mod} onChange={(e) => setMod(e.target.value as SapModule)}>
                {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="settings-label">Contenido (Markdown soportado)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# Cómo extender un material al centro 1100\n\n## Pasos\n\n1. Acceder a MM01 / MM02\n2. Indicar el material y nuevo centro\n3. Confirmar vistas a copiar\n4. Verificar en MMBE\n\n## Errores comunes\n- Error M8-077: indica que el período contable no está abierto`}
              style={{ minHeight: 280, fontSize: 13, fontFamily: "var(--font-mono, monospace)" }}
              maxLength={maxChars}
            />
            <div className="row between" style={{ marginTop: 4, fontSize: 10.5, color: "var(--text-dim)" }}>
              <span>min 20 chars · max {maxChars.toLocaleString()} chars · pasa por chunking + embedding</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", color: chars > maxChars * 0.9 ? "#fbbf24" : "var(--text-dim)" }}>
                {chars.toLocaleString()} / {maxChars.toLocaleString()}
              </span>
            </div>
          </div>

          {result && (
            <div className={result.ok ? "alert ok" : "alert error"} style={{ fontSize: 12.5 }}>
              {result.msg}
            </div>
          )}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={submit} disabled={submitting || content.trim().length < 20}>
              {submitting ? <><span className="spinner" /> indexando…</> : "📤 Indexar como knowledge"}
            </button>
            <button className="btn ghost" onClick={() => { setTitle(""); setContent(""); setResult(null); }}>↻ limpiar</button>
          </div>
        </div>
      </div>

      {/* URL ingest */}
      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🔗</span> QUICK-ADD · DESDE URL
        </div>
        <p className="settings-section-desc">
          Descargá una nota OSS, una página de wiki interna, un manual público o un FAQ.
          Backend extrae el texto (HTML/MD/TXT, hasta 8 MB), genera chunks y los indexa con embeddings.
          PDF público todavía no — fase siguiente.
        </p>

        <div className="col" style={{ gap: 10 }}>
          <div>
            <label className="settings-label">URL (http o https)</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://wiki.empresa.com/sap/mm/migo-checklist"
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12.5 }} />
          </div>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="settings-label">Título (opcional, se detecta del &lt;title&gt;)</label>
              <input value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)}
                placeholder="Checklist MIGO contra OC" />
            </div>
            <div style={{ width: 200 }}>
              <label className="settings-label">Módulo SAP</label>
              <select value={urlMod} onChange={(e) => setUrlMod(e.target.value as SapModule)}>
                {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {urlResult && (
            <div className={urlResult.ok ? "alert ok" : "alert error"} style={{ fontSize: 12.5 }}>
              {urlResult.msg}
            </div>
          )}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={submitUrl} disabled={urlSubmitting || !url.trim()}>
              {urlSubmitting ? <><span className="spinner" /> descargando…</> : "🌐 Descargar e indexar"}
            </button>
            <button className="btn ghost" onClick={() => { setUrl(""); setUrlTitle(""); setUrlResult(null); }}>↻ limpiar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL CHUNKS
// ============================================================================
function ChunksModal({ data, onClose }: {
  data: { doc: KnowledgeDocument; chunks: KnowledgeChunk[] | null; loading: boolean };
  onClose: () => void;
}) {
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="admin-modal-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>📑 Chunks de "{data.doc.title ?? data.doc.source_file}"</h3>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
              {data.doc.chunk_count} chunks · {data.doc.total_tokens.toLocaleString()} tokens estimados
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {data.loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-soft)" }}>
              <span className="spinner" /> cargando chunks…
            </div>
          ) : !data.chunks || data.chunks.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)" }}>
              No hay chunks indexados. Si el documento está en estado "error", revisalo.
            </div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {data.chunks.map((c) => (
                <div key={c.id} className="rag-chunk">
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span className="rag-rank">chunk {c.chunk_index}</span>
                    <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                      ~{c.estimated_tokens} tokens
                    </span>
                  </div>
                  <div className="rag-chunk-text" style={{ maxHeight: 140 }}>{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function KnowledgePage() {
  return (
    <RequirePermission screen="conocimiento_rag" action="view">
      <KnowledgePageInner />
    </RequirePermission>
  );
}
