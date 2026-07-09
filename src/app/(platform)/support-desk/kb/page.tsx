"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MarkdownView from "@/components/agent/MarkdownView";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { supportApi, type KbArticle, type KbStatus } from "@/services/support.api";
import type { SapModule } from "@/types";

const SAP_MODULES: SapModule[] = [
  "NO_INFORMADO", "MM", "SD", "PP", "WM", "EWM",
  "QM", "PM", "ARIBA", "IBP", "BTP", "INTEGRACION",
];

const STATUS_META: Record<KbStatus, { color: string; label: string; icon: string }> = {
  draft:    { color: "#8a6d00", label: "Draft",     icon: "📝" },
  approved: { color: "#10b981", label: "Aprobado",  icon: "✓" },
  archived: { color: "#6b7280", label: "Archivado", icon: "📦" },
};

const STATUS_ORDER: (KbStatus | "all")[] = ["all", "approved", "draft", "archived"];

const SAP_MODULE_COLORS: Record<string, string> = {
  MM: "#4589ff", SD: "#a855f7", PP: "#f59e0b", WM: "#10b981", EWM: "#06b6d4",
  QM: "#f43f5e", PM: "#3b82f6", ARIBA: "#f1c21b", IBP: "#8b5cf6", BTP: "#06b6d4",
  INTEGRACION: "#fa4d56", NO_INFORMADO: "#64748b",
};

// Templates rápidos por módulo SAP
const TEMPLATES: Record<string, { title: string; problem: string; solution: string; category: string }[]> = {
  MM: [
    {
      title: "Error M8-077 al cerrar período",
      problem: "Al ejecutar MMPV aparece el error 'documento no contabilizado'.",
      solution: "1. Identificar documentos pendientes con **MB5L**.\n2. Para cada uno, ir a **MIGO** y contabilizar.\n3. Reintentar **MMPV**.\n4. Si persiste, revisar entradas de mercancía sin factura en **MB5S**.",
      category: "cierre",
    },
    {
      title: "Material no extendido al centro",
      problem: "Al crear pedido o pedir movimiento, sale error que el material no está extendido al centro.",
      solution: "1. Ir a **MM01** (extender) o **MM02** (modificar).\n2. Indicar material y nuevo centro.\n3. Seleccionar vistas a copiar desde un centro existente.\n4. Confirmar con MMBE que aparece el stock en el nuevo centro.",
      category: "maestros",
    },
  ],
  PP: [
    {
      title: "MRP no genera órdenes planificadas",
      problem: "El job MRP corre pero no genera propuestas para un material en un centro específico.",
      solution: "1. Verificar la estrategia de planificación en **MM02 → vista MRP1**.\n2. Confirmar que existe una versión activa con stock objetivo > 0.\n3. Revisar excepciones de cobertura en **MD04**.\n4. Verificar que el material está marcado para MRP en MRP1.",
      category: "MRP",
    },
  ],
  SD: [
    {
      title: "Pedido no determina precio",
      problem: "Al crear un pedido de venta el precio queda en 0 o sale error de condición.",
      solution: "1. Verificar la determinación de precios en el tipo de documento (**VOV8**).\n2. Confirmar registros de condición vigentes en **VK11/VK13**.\n3. Revisar el esquema de cálculo en **OVKK**.\n4. Comparar análisis del precio en la pestaña Condiciones del pedido.",
      category: "pricing",
    },
  ],
};

export default function KbPage() {
  const toast = useToast();
  const { user } = useAuth();
  const isApprover = user?.role === "admin" || user?.role === "aprobador";

  const [list, setList] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<KbStatus | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KbArticle | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newSystem, setNewSystem] = useState<SapModule>("NO_INFORMADO");
  const [newCategory, setNewCategory] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.listKb();
    if ("success" in r && r.success) setList(r.articles);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleApprove(a: KbArticle) {
    const r = await supportApi.approveKb(a.id);
    if ("success" in r && r.success) {
      toast.success("Artículo aprobado");
      refresh();
      if (selected?.id === a.id) setSelected(r.article);
    } else toast.error("error" in r ? r.error : "Error");
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

  async function handleHelpful(a: KbArticle) {
    const r = await supportApi.markKbHelpful(a.id);
    if ("success" in r && r.success) {
      toast.success("👍 Marcado como útil");
      refresh();
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
    } else toast.error("error" in r ? r.error : "Error");
  }

  function applyTemplate(t: { title: string; problem: string; solution: string; category: string }) {
    setNewTitle(t.title);
    setNewProblem(t.problem);
    setNewSolution(t.solution);
    setNewCategory(t.category);
  }

  // Stats
  const stats = useMemo(() => {
    const total = list.length;
    const approved = list.filter((a) => a.status === "approved").length;
    const draft = list.filter((a) => a.status === "draft").length;
    const archived = list.filter((a) => a.status === "archived").length;
    const totalUse = list.reduce((a, b) => a + (b.use_count ?? 0), 0);
    const totalHelpful = list.reduce((a, b) => a + (b.helpful_count ?? 0), 0);
    const fromTickets = list.filter((a) => a.source === "from_ticket").length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, draft, archived, totalUse, totalHelpful, fromTickets, approvalRate };
  }, [list]);

  const distinctModules = useMemo(() => {
    const set = new Set<string>();
    list.forEach((a) => { if (a.system) set.add(a.system); });
    return Array.from(set).sort();
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (moduleFilter !== "all" && a.system !== moduleFilter) return false;
      if (q) {
        const hay = [a.title, a.problem, a.solution, a.system, a.category].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, statusFilter, moduleFilter, search]);

  const templatesForModule = newSystem !== "NO_INFORMADO" ? (TEMPLATES[newSystem] ?? []) : [];

  return (
    <div>
      {/* Hero */}
      <div className="sd-hero">
        <span className="id-tc tl" /><span className="id-tc tr" />
        <span className="id-tc bl" /><span className="id-tc br" />
        <div className="sd-hero-grid" />
        <div className="row between" style={{ flexWrap: "wrap", gap: 14, alignItems: "center", position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-dim)" }}>SUPPORT · KB · CURADA</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, letterSpacing: 0.5 }}>📘 Base de Conocimiento</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 12.5 }}>
              Artículos problema→solución que la IA consulta <b>antes</b> del RAG documental. Distinta del knowledge de PDFs.
            </p>
          </div>
          <div className="kanban-stats">
            <div className="kanban-stat" style={{ ["--accent" as never]: "#4589ff" }}>
              <div className="kanban-stat-val">{stats.total}</div>
              <div className="kanban-stat-lbl">TOTAL</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#10b981" }}>
              <div className="kanban-stat-val">{stats.approved}</div>
              <div className="kanban-stat-lbl">APROBADOS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#f1c21b" }}>
              <div className="kanban-stat-val">{stats.draft}</div>
              <div className="kanban-stat-lbl">DRAFTS</div>
            </div>
            <div className="kanban-stat" style={{ ["--accent" as never]: "#a855f7" }}>
              <div className="kanban-stat-val">{stats.totalUse}</div>
              <div className="kanban-stat-lbl">USOS IA</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
          {STATUS_ORDER.map((s) => {
            const meta = s === "all" ? null : STATUS_META[s];
            const count = s === "all" ? stats.total
                        : s === "approved" ? stats.approved
                        : s === "draft" ? stats.draft
                        : stats.archived;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`ticket-filter ${statusFilter === s ? "active" : ""}`}
                style={{ ["--filt-color" as never]: meta?.color ?? "#4589ff" }}>
                {meta ? `${meta.icon} ${meta.label}` : "▸ Todos"} <span className="ticket-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10, alignItems: "center", position: "relative", zIndex: 2 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, problema, solución, módulo..."
            style={{ flex: 1, fontSize: 12.5 }} />
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="all">Todos los módulos</option>
            {distinctModules.map((m) => <option key={m} value={m}>{m} ({list.filter((a) => a.system === m).length})</option>)}
          </select>
          <button onClick={() => setShowCreate(!showCreate)} className="btn primary" style={{ padding: "5px 12px", fontSize: 12 }}>
            {showCreate ? "✕ Cancelar" : "➕ Nuevo artículo"}
          </button>
          <button onClick={refresh} className="btn ghost" disabled={loading} style={{ padding: "5px 12px", fontSize: 12 }}>
            {loading ? <><span className="spinner" /> cargando</> : "↻"}
          </button>
        </div>
      </div>

      {/* Form de creación */}
      {showCreate && (
        <div className="card kb-create-card">
          <div className="ticket-section-head">
            <span style={{ color: "var(--accent)" }}>➕</span> NUEVO ARTÍCULO
          </div>

          {/* Templates */}
          {templatesForModule.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", letterSpacing: 1.5, marginBottom: 6 }}>
                TEMPLATES PARA {newSystem}
              </div>
              <div className="kb-templates">
                {templatesForModule.map((t) => (
                  <button key={t.title} className="kb-template" onClick={() => applyTemplate(t)}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{t.category}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="col" style={{ gap: 10 }}>
            <div>
              <label className="settings-label">Título (cómo lo describiría el usuario)</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ej: No puedo cerrar el período en MM" />
            </div>
            <div>
              <label className="settings-label">Problema / síntomas</label>
              <textarea value={newProblem} onChange={(e) => setNewProblem(e.target.value)} placeholder="Al ejecutar MMPV sale el error M8-077..." style={{ minHeight: 70 }} />
            </div>
            <div>
              <label className="settings-label">Solución (markdown ok — usá listas numeradas)</label>
              <textarea value={newSolution} onChange={(e) => setNewSolution(e.target.value)} placeholder="1. Identificar documentos pendientes con MB5L..." style={{ minHeight: 150, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }} />
            </div>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div style={{ width: 180 }}>
                <label className="settings-label">Módulo SAP</label>
                <select value={newSystem} onChange={(e) => setNewSystem(e.target.value as SapModule)}>
                  {SAP_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="settings-label">Categoría</label>
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="ej: pricing, liberación, MRP..." />
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" onClick={handleCreate}>📝 Crear como draft</button>
              {isApprover && (
                <div style={{ fontSize: 11.5, color: "var(--text-soft)", alignSelf: "center" }}>
                  Como <b>{user?.role}</b>, después podés aprobar desde la lista.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="ticket-shell">
        {/* LISTA */}
        <div className="ticket-list-wrap">
          <div className="ticket-list-head">
            <span>{filtered.length} artículo{filtered.length === 1 ? "" : "s"}</span>
            <span style={{ marginLeft: "auto", fontSize: 10.5 }}>👍 {stats.totalHelpful} · 🤖 {stats.totalUse}</span>
          </div>

          {loading && list.length === 0 && (
            <div className="ticket-list-skeleton">
              {[1, 2, 3, 4].map((i) => <div key={i} className="ticket-skel" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="ticket-empty">
              <div style={{ fontSize: 36, marginBottom: 6 }}>📘</div>
              <div style={{ fontSize: 13.5 }}>
                {list.length === 0
                  ? "Aún no hay artículos. Creá uno con el botón ➕ Nuevo."
                  : "Ningún artículo coincide con los filtros."}
              </div>
            </div>
          )}

          <div className="ticket-list">
            {filtered.map((a) => {
              const status = STATUS_META[a.status];
              const moduleColor = SAP_MODULE_COLORS[a.system ?? ""] ?? "#64748b";
              const active = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`ticket-row kb-row ${active ? "active" : ""}`}
                  style={{ ["--prio-color" as never]: moduleColor, ["--status-color" as never]: status.color }}
                >
                  <span className="kb-module-tag" style={{ background: moduleColor, color: "white" }}>
                    {a.system || "—"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                      <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55` }}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.problem}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {a.category && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#7c3aed", background: "rgba(168,85,247,0.08)" }}>{a.category}</span>
                      )}
                      {a.source === "from_ticket" && (
                        <span className="kanban-tag" style={{ borderColor: "rgba(241,194,27,0.4)", color: "#8a6d00", background: "rgba(241,194,27,0.08)" }}>📤 de ticket</span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
                        👍 {a.helpful_count} · 🤖 {a.use_count}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAIL */}
        <div className="ticket-detail">
          {!selected ? (
            <div className="ticket-empty">
              <div style={{ fontSize: 44, marginBottom: 8 }}>📘</div>
              <div style={{ fontSize: 13.5, color: "var(--text-soft)", textAlign: "center" }}>
                Seleccioná un artículo para ver problema, solución y métricas de uso por la IA.
              </div>
            </div>
          ) : (
            <KbDetail
              article={selected}
              isApprover={isApprover}
              onApprove={() => handleApprove(selected)}
              onArchive={() => handleArchive(selected)}
              onDelete={() => handleDelete(selected)}
              onHelpful={() => handleHelpful(selected)}
              onDeselect={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL
// ============================================================================
function KbDetail({ article, isApprover, onApprove, onArchive, onDelete, onHelpful, onDeselect }: {
  article: KbArticle; isApprover: boolean;
  onApprove: () => void; onArchive: () => void; onDelete: () => void; onHelpful: () => void; onDeselect: () => void;
}) {
  const status = STATUS_META[article.status];
  const moduleColor = SAP_MODULE_COLORS[article.system ?? ""] ?? "#64748b";

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="ticket-detail-head">
        <span className="kb-module-tag" style={{ background: moduleColor, color: "white", width: 48, height: 48, fontSize: 13, borderRadius: 10 }}>
          {article.system || "—"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 0.3 }}>{article.title}</h2>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span className="ticket-status" style={{ background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}55` }}>
              {status.icon} {status.label}
            </span>
            {article.category && (
              <span className="kanban-tag" style={{ borderColor: "rgba(168,85,247,0.4)", color: "#7c3aed", background: "rgba(168,85,247,0.08)" }}>{article.category}</span>
            )}
            {article.source === "from_ticket" && (
              <span className="kanban-tag" style={{ borderColor: "rgba(241,194,27,0.4)", color: "#8a6d00", background: "rgba(241,194,27,0.08)" }}>📤 de ticket</span>
            )}
          </div>
        </div>
        <button className="btn ghost" onClick={onDeselect} style={{ padding: "3px 8px", fontSize: 14 }}>×</button>
      </div>

      {/* Stats grid */}
      <div className="kb-stats-grid">
        <div className="kb-stat">
          <div className="kb-stat-val" style={{ color: "#a855f7" }}>{article.use_count}</div>
          <div className="kb-stat-lbl">🤖 USOS IA</div>
        </div>
        <div className="kb-stat">
          <div className="kb-stat-val" style={{ color: "#10b981" }}>{article.helpful_count}</div>
          <div className="kb-stat-lbl">👍 ÚTIL</div>
        </div>
        <div className="kb-stat">
          <div className="kb-stat-val" style={{ color: "#4589ff", fontSize: 13 }}>{article.source === "from_ticket" ? "TICKET" : "MANUAL"}</div>
          <div className="kb-stat-lbl">ORIGEN</div>
        </div>
        <div className="kb-stat">
          <div className="kb-stat-val" style={{ color: "var(--text)", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
            {new Date(article.created_at).toLocaleDateString("es-CL")}
          </div>
          <div className="kb-stat-lbl">CREADO</div>
        </div>
      </div>

      {/* Problem */}
      <div className="kb-block kb-block-problem">
        <div className="ticket-section-head">
          <span style={{ color: "#fa4d56" }}>❌</span> PROBLEMA
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {article.problem}
        </div>
      </div>

      {/* Solution */}
      <div className="kb-block kb-block-solution">
        <div className="ticket-section-head">
          <span style={{ color: "#10b981" }}>✓</span> SOLUCIÓN
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          <MarkdownView text={article.solution} />
        </div>
      </div>

      {/* Test del RAG playground link */}
      <Link
        href={`/knowledge?test=${encodeURIComponent(article.title)}`}
        className="kb-test-link"
        title="Probar cómo recupera la IA esta info">
        🔬 Probar en RAG Playground →
      </Link>

      {/* Acciones */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={onHelpful} style={{ fontSize: 12 }}>
          👍 Marcar útil ({article.helpful_count})
        </button>
        {article.status === "draft" && isApprover && (
          <button className="btn primary" onClick={onApprove}>✓ Aprobar</button>
        )}
        {article.status !== "archived" && (
          <button className="btn ghost" onClick={onArchive}>📦 Archivar</button>
        )}
        {isApprover && (
          <button className="btn ghost" onClick={onDelete} style={{ color: "#fa4d56", marginLeft: "auto" }}>🗑 Eliminar</button>
        )}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
        Creado {new Date(article.created_at).toLocaleString("es-CL")}
        {article.approved_at && ` · Aprobado ${new Date(article.approved_at).toLocaleString("es-CL")}`}
        {article.source_ticket_id && ` · Ticket origen ${article.source_ticket_id.slice(0, 8)}…`}
      </div>
    </div>
  );
}
