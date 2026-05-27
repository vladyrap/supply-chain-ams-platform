"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { supportApi, type KbArticle, type KbStatus } from "@/services/support.api";
import type { SapModule } from "@/types";

const SAP_MODULES: SapModule[] = [
  "NO_INFORMADO", "MM", "SD", "PP", "WM", "EWM",
  "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION",
];

export default function KbPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isApprover = user?.role === "admin" || user?.role === "aprobador";

  const [list, setList] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<KbStatus | "all">("all");
  const [selected, setSelected] = useState<KbArticle | null>(null);

  // Nuevo
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newSystem, setNewSystem] = useState<SapModule>("NO_INFORMADO");
  const [newCategory, setNewCategory] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.listKb(statusFilter !== "all" ? { status: statusFilter } : undefined);
    if ("success" in r && r.success) setList(r.articles);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleApprove(a: KbArticle) {
    const r = await supportApi.approveKb(a.id);
    if ("success" in r && r.success) {
      toast.success("Artículo aprobado");
      refresh();
      if (selected?.id === a.id) setSelected(r.article);
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }
  async function handleArchive(a: KbArticle) {
    const r = await supportApi.archiveKb(a.id);
    if ("success" in r && r.success) {
      toast.success("Archivado");
      refresh();
    }
  }
  async function handleDelete(a: KbArticle) {
    if (!confirm(`¿Eliminar "${a.title}"?`)) return;
    const r = await supportApi.deleteKb(a.id);
    if ("success" in r && r.success) {
      toast.success("Eliminado");
      refresh();
      if (selected?.id === a.id) setSelected(null);
    }
  }
  async function handleCreate() {
    if (!newTitle.trim() || !newProblem.trim() || !newSolution.trim()) {
      toast.warn("Completa título, problema y solución");
      return;
    }
    const r = await supportApi.createKb({
      title: newTitle.trim(),
      problem: newProblem.trim(),
      solution: newSolution.trim(),
      system: newSystem === "NO_INFORMADO" ? undefined : newSystem,
      category: newCategory.trim() || undefined,
    });
    if ("success" in r && r.success) {
      toast.success("Artículo creado (draft)");
      setShowCreate(false);
      setNewTitle(""); setNewProblem(""); setNewSolution(""); setNewCategory(""); setNewSystem("NO_INFORMADO");
      refresh();
    } else {
      toast.error("error" in r ? r.error : "Error");
    }
  }

  const filterOptions: { id: KbStatus | "all"; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "approved", label: "Aprobados" },
    { id: "draft", label: "Drafts" },
    { id: "archived", label: "Archivados" },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>📘 Base de Conocimiento curada</h1>
        <p>Artículos problema → solución que la IA de la mesa consulta primero. Distinta del RAG documental (PDFs).</p>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {filterOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setStatusFilter(o.id)}
            className={`btn ${statusFilter === o.id ? "primary" : "ghost"}`}
            style={{ padding: "4px 12px" }}
          >{o.label}</button>
        ))}
        <button onClick={() => setShowCreate(!showCreate)} className="btn primary" style={{ marginLeft: "auto" }}>
          {showCreate ? "✕ Cancelar" : "➕ Nuevo artículo"}
        </button>
        <button onClick={refresh} className="btn ghost" disabled={loading}>
          {loading ? <><span className="spinner" /></> : "↻"}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>Nuevo artículo</h3>
          <div className="col" style={{ gap: 10 }}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título (cómo lo describiría el usuario)" />
            <textarea value={newProblem} onChange={(e) => setNewProblem(e.target.value)} placeholder="Síntomas / problema..." style={{ minHeight: 70 }} />
            <textarea value={newSolution} onChange={(e) => setNewSolution(e.target.value)} placeholder="Pasos numerados de la solución (markdown ok)..." style={{ minHeight: 120 }} />
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ width: 180 }}>
                <label className="lab">Módulo</label>
                <select value={newSystem} onChange={(e) => setNewSystem(e.target.value as SapModule)}>
                  {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="lab">Categoría</label>
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="ej: pricing, liberación, MRP..." />
              </div>
            </div>
            <button className="btn primary" onClick={handleCreate}>Crear como draft</button>
            {isApprover && (
              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                Como {user?.role}, después podrás aprobar el artículo desde la lista.
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {list.length} artículo{list.length === 1 ? "" : "s"}
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {list.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>Sin artículos. Crea uno con el botón ➕.</div>
            )}
            {list.map((a) => {
              const active = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</div>
                    <Badge variant={a.status === "approved" ? "ok" : a.status === "draft" ? "warn" : "muted"}>{a.status}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.problem}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    {a.system && <Badge variant="tech">{a.system}</Badge>}
                    {a.category && <Badge variant="muted">{a.category}</Badge>}
                    {a.source === "from_ticket" && <Badge variant="info">de ticket</Badge>}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>
                      👍 {a.helpful_count} · 🤖 {a.use_count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          {!selected && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona un artículo.</div>}
          {selected && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{selected.title}</h3>
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant={selected.status === "approved" ? "ok" : selected.status === "draft" ? "warn" : "muted"}>{selected.status}</Badge>
                    {selected.system && <Badge variant="tech">{selected.system}</Badge>}
                    {selected.category && <Badge variant="muted">{selected.category}</Badge>}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {selected.status === "draft" && isApprover && (
                    <button className="btn primary" onClick={() => handleApprove(selected)}>✓ Aprobar</button>
                  )}
                  {selected.status !== "archived" && (
                    <button className="btn ghost" onClick={() => handleArchive(selected)}>Archivar</button>
                  )}
                  {isApprover && (
                    <button className="btn danger" onClick={() => handleDelete(selected)}>🗑</button>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Problema</h4>
                <div className="msg user"><div className="body" style={{ whiteSpace: "pre-wrap" }}>{selected.problem}</div></div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Solución</h4>
                <div className="msg agent"><div className="body"><MarkdownView text={selected.solution} /></div></div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Origen: <b>{selected.source}</b>{selected.source_ticket_id && ` (ticket ${selected.source_ticket_id.slice(0, 8)}…)`} ·
                Usado por IA <b>{selected.use_count}</b> veces · Marcado útil <b>{selected.helpful_count}</b> veces ·
                Creado {new Date(selected.created_at).toLocaleString()}
                {selected.approved_at && ` · Aprobado ${new Date(selected.approved_at).toLocaleString()}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
