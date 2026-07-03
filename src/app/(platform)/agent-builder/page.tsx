"use client";

// =============================================================================
// /agent-builder — v1.3 Agent Hub · Onda 4
// =============================================================================
// Módulo completo de creación y publicación de agentes:
//   1. Diseñar   → formulario (identidad + instrucciones + KB)
//   2. Probar    → playground de chat contra el borrador guardado
//   3. Publicar  → el agente pasa de borrador privado a visible para el equipo
// Modo edición: /agent-builder?id=<agentId> (solo agentes propios no-verified).
// =============================================================================

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import {
  getAgent, createAgent, updateAgent, publishAgent, unpublishAgent,
  chatWithAgent, getModelsCatalog, listAgentVersions, restoreAgentVersion,
  compareAgentModels, AGENT_CATEGORIES, AGENT_MODELS, modelLabel,
  type CustomAgent, type ModelAvailability, type AgentVersion, type ModelComparisonEntry,
} from "@/services/custom-agents.api";
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/agent-templates";

const ICON_CHOICES = ["🤖", "📦", "🛒", "🏭", "💰", "📊", "🔗", "🏗️", "🧠", "⚡", "🛠️", "📋", "🧮", "🗂️", "🔍", "✉️"];
const MAX_INSTRUCTIONS = 6000;
const MIN_INSTRUCTIONS = 30;

interface PlaygroundMsg {
  role: "user" | "agent";
  content: string;
  meta?: string;
}

function AgentBuilderInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const userId = user?.email ?? user?.name ?? "";

  // ── Entidad guardada (null = aún no existe en backend) ──
  const [agent, setAgent] = useState<CustomAgent | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [notFound, setNotFound] = useState(false);

  // ── Form ──
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🤖");
  const [category, setCategory] = useState<string>("GENERAL");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [kbModules, setKbModules] = useState<string[]>([]);
  const [model, setModel] = useState<string>("gemini-2.5-flash");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Playground ──
  const [pgMessages, setPgMessages] = useState<PlaygroundMsg[]>([]);
  const [pgInput, setPgInput] = useState("");
  const [pgBusy, setPgBusy] = useState(false);
  const [pgConvId, setPgConvId] = useState<string | undefined>(undefined);
  const pgEndRef = useRef<HTMLDivElement>(null);

  // ── Onda 5: disponibilidad de modelos, versiones, comparador ──
  const [modelsAvail, setModelsAvail] = useState<Record<string, ModelAvailability>>({});
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareModel2, setCompareModel2] = useState<string>("");
  const [compareMsg, setCompareMsg] = useState("");
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareResults, setCompareResults] = useState<ModelComparisonEntry[] | null>(null);

  // Catálogo de disponibilidad real (según API keys del backend)
  useEffect(() => {
    (async () => {
      const r = await getModelsCatalog();
      if (r.success) {
        const map: Record<string, ModelAvailability> = {};
        for (const m of r.models) map[m.id] = m;
        setModelsAvail(map);
      }
    })();
  }, []);

  // Historial de versiones del agente cargado
  useEffect(() => {
    if (!agent?.id) { setVersions([]); return; }
    (async () => {
      const r = await listAgentVersions(agent.id);
      if (r.success) setVersions(r.versions);
    })();
  }, [agent?.id, agent?.updatedAt]);

  useEffect(() => {
    pgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pgMessages]);

  // Cargar agente en modo edición
  useEffect(() => {
    if (!editId || !userId) return;
    (async () => {
      setLoading(true);
      const r = await getAgent(editId, userId);
      setLoading(false);
      if (!r.success) { setNotFound(true); return; }
      const a = r.agent;
      if (a.isVerified) { setNotFound(true); return; } // los de fábrica no se editan
      setAgent(a);
      setName(a.name); setIcon(a.icon); setCategory(a.category);
      setDescription(a.description); setInstructions(a.instructions);
      setKbModules(a.kbModules);
      setModel(a.model || "gemini-2.5-flash");
      setDirty(false);
    })();
  }, [editId, userId]);

  const markDirty = () => { setDirty(true); setNotice(null); };

  function toggleKbModule(m: string) {
    setKbModules((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
    markDirty();
  }

  function validate(forPublish: boolean): string | null {
    if (!name.trim()) return "El nombre es obligatorio.";
    if (instructions.trim().length < MIN_INSTRUCTIONS) {
      return `Las instrucciones deben tener al menos ${MIN_INSTRUCTIONS} caracteres.`;
    }
    if (instructions.length > MAX_INSTRUCTIONS) {
      return `Las instrucciones superan ${MAX_INSTRUCTIONS} caracteres.`;
    }
    if (forPublish && !description.trim()) {
      return "Agregá una descripción corta antes de publicar: es lo que ve el equipo en la biblioteca.";
    }
    return null;
  }

  // Guardar borrador (create o update). Devuelve el agente guardado o null.
  const save = useCallback(async (): Promise<CustomAgent | null> => {
    const v = validate(false);
    if (v) { setError(v); return null; }
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      instructions: instructions.trim(),
      kbModules,
      icon,
      model,
    };
    const r = agent
      ? await updateAgent(agent.id, payload)
      : await createAgent({ ...payload, visibility: "private", createdBy: userId });
    setBusy(false);
    if (!r.success) { setError(r.error); return null; }
    setAgent(r.agent);
    setDirty(false);
    setNotice(agent ? "Cambios guardados." : "Borrador guardado — probalo en el playground antes de publicar.");
    return r.agent;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, name, category, description, instructions, kbModules, icon, model, userId]);

  async function handlePublish() {
    const v = validate(true);
    if (v) { setError(v); return; }
    // Si hay cambios sin guardar, guardamos primero
    let target = agent;
    if (!target || dirty) {
      target = await save();
      if (!target) return;
    }
    if (!window.confirm(`¿Publicar "${target.name}" para todo el equipo? Aparecerá en la Biblioteca de Agentes y cualquiera podrá chatear con él.`)) return;
    setBusy(true);
    const r = await publishAgent(target.id, userId);
    setBusy(false);
    if (r.success) {
      setAgent(r.agent);
      setNotice("🎉 Agente publicado — ya está disponible para el equipo en la Biblioteca.");
    } else setError(r.error);
  }

  async function handleUnpublish() {
    if (!agent) return;
    if (!window.confirm(`¿Volver "${agent.name}" a borrador? El equipo dejará de verlo en la Biblioteca.`)) return;
    setBusy(true);
    const r = await unpublishAgent(agent.id, userId);
    setBusy(false);
    if (r.success) {
      setAgent(r.agent);
      setNotice("El agente volvió a borrador privado.");
    } else setError(r.error);
  }

  // ── Onda 5: plantillas ──
  function applyTemplate(t: AgentTemplate) {
    setName(t.title); setIcon(t.icon); setCategory(t.category);
    setDescription(t.description); setInstructions(t.instructions);
    setKbModules(t.kbModules); setModel(t.model);
    setDirty(true);
    setError(null);
    setNotice(`Plantilla "${t.title}" aplicada — ajustala a tu necesidad y guardá el borrador.`);
  }

  // ── Onda 5: restaurar versión ──
  async function handleRestore(v: AgentVersion) {
    if (!agent) return;
    const when = new Date(v.savedAt).toLocaleString("es-CL");
    if (!window.confirm(`¿Restaurar la versión del ${when}? El estado actual también queda en el historial, así que es reversible.`)) return;
    setRestoreBusy(v.id);
    const r = await restoreAgentVersion(agent.id, v.id, userId);
    setRestoreBusy(null);
    if (r.success) {
      const a = r.agent;
      setAgent(a);
      setName(a.name); setIcon(a.icon); setCategory(a.category);
      setDescription(a.description); setInstructions(a.instructions);
      setKbModules(a.kbModules); setModel(a.model || "gemini-2.5-flash");
      setDirty(false);
      setNotice(`Versión del ${when} restaurada.`);
    } else setError(r.error);
  }

  // ── Onda 5: comparador de modelos ──
  function toggleCompare() {
    setCompareOpen((cur) => {
      const next = !cur;
      if (next && (!compareModel2 || compareModel2 === model)) {
        const other = AGENT_MODELS.find((m) => m.id !== model);
        setCompareModel2(other?.id ?? "");
      }
      return next;
    });
  }

  async function runCompare(e: React.FormEvent) {
    e.preventDefault();
    const msg = compareMsg.trim();
    if (!msg || compareBusy) return;
    let target = agent;
    if (!target || dirty) {
      target = await save();
      if (!target) return;
    }
    setCompareBusy(true);
    setCompareResults(null);
    const r = await compareAgentModels(target.id, {
      message: msg,
      models: [model, compareModel2],
      user: userId,
    });
    setCompareBusy(false);
    if (r.success) setCompareResults(r.results);
    else setError(r.error);
  }

  // ── Playground ──
  async function sendPlayground(e: React.FormEvent) {
    e.preventDefault();
    const msg = pgInput.trim();
    if (!msg || pgBusy) return;
    // El playground siempre prueba la última versión guardada
    let target = agent;
    if (!target || dirty) {
      target = await save();
      if (!target) return;
    }
    setPgInput("");
    setPgMessages((cur) => [...cur, { role: "user", content: msg }]);
    setPgBusy(true);
    const r = await chatWithAgent(target.id, { message: msg, user: userId, conversationId: pgConvId });
    setPgBusy(false);
    if (r.success) {
      setPgConvId(r.conversationId);
      setPgMessages((cur) => [...cur, {
        role: "agent",
        content: r.response,
        meta: `${r.metadata?.model ?? ""} · confianza ${r.metadata?.confidence ?? "—"}`,
      }]);
    } else {
      setPgMessages((cur) => [...cur, { role: "agent", content: `⚠ ${r.error}` }]);
    }
  }

  const isPublished = agent ? (agent.visibility === "team" || agent.visibility === "public") : false;
  const instrLen = instructions.length;

  if (notFound) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🔍</div>
        <div style={{ fontSize: 15, marginBottom: 6 }}>Agente no encontrado</div>
        <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 16 }}>
          El agente no existe, es de otro usuario o es un agente verificado del sistema (no editable).
        </div>
        <Link href="/agent-library" className="btn primary">← Volver a la Biblioteca</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Cargando agente…</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="page-title" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0 }}>🛠️ Agent Builder</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-soft)", fontSize: 13 }}>
              Diseñá tu agente, probalo en el playground y publicalo para todo el equipo.
            </p>
          </div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            {agent && (
              isPublished
                ? <Badge variant="ok">👥 Publicado al equipo</Badge>
                : <Badge variant="info">📝 Borrador privado</Badge>
            )}
            <Link href="/agent-library" className="btn ghost" style={{ fontSize: 12.5 }}>← Biblioteca</Link>
          </div>
        </div>
      </div>

      {/* Stepper visual */}
      <div className="row" style={{ gap: 0, marginBottom: 18, fontSize: 12 }}>
        {[
          { n: 1, t: "Diseñar", done: !!agent },
          { n: 2, t: "Probar", done: pgMessages.length > 0 },
          { n: 3, t: "Publicar", done: isPublished },
        ].map((s, i) => (
          <div key={s.n} className="row" style={{ alignItems: "center" }}>
            {i > 0 && <div style={{ width: 34, height: 1, background: "var(--border-soft)", margin: "0 8px" }} />}
            <span style={{
              width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 700,
              background: s.done ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${s.done ? "#34d399" : "var(--border-soft)"}`,
              color: s.done ? "#34d399" : "var(--text-dim)",
            }}>{s.done ? "✓" : s.n}</span>
            <span style={{ marginLeft: 6, color: s.done ? "#34d399" : "var(--text-soft)" }}>{s.t}</span>
          </div>
        ))}
      </div>

      {/* Onda 5 · Galería de plantillas (solo con el form vacío) */}
      {!agent && !editId && !name.trim() && !instructions.trim() && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="row between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase" }}>
              ✨ Plantillas para empezar en 1 clic
            </div>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-soft)" }}>
            Elegí un punto de partida curado — instrucciones, modelo y KB ya configurados. Después lo ajustás a tu medida.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {AGENT_TEMPLATES.map((t) => (
              <button type="button" key={t.key} onClick={() => applyTemplate(t)}
                style={{
                  textAlign: "left", padding: 14, borderRadius: 12, cursor: "pointer",
                  border: "1px solid var(--border-soft)", background: "rgba(255,255,255,0.02)",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{
                    fontSize: 18, width: 34, height: 34, display: "grid", placeItems: "center",
                    borderRadius: 9, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
                  }}>{t.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{t.title}</span>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>{t.tagline}</span>
                <div className="row" style={{ gap: 6, marginTop: "auto" }}>
                  <Badge variant="muted">{t.category}</Badge>
                  <Badge variant="muted">🧠 {modelLabel(t.model)}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layout: form izquierda + panel derecha */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 400px", gap: 16, alignItems: "start" }}>
        {/* ══════ Columna form ══════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1 · Identidad */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>
              1 · Identidad
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 170px", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Nombre *</label>
                <input value={name} onChange={(e) => { setName(e.target.value); markDirty(); }}
                  placeholder="Ej: Asistente de cierres FI" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Categoría</label>
                <select value={category} onChange={(e) => { setCategory(e.target.value); markDirty(); }} style={{ width: "100%" }}>
                  {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                Descripción corta <span style={{ color: "var(--text-dim)" }}>(la ve el equipo en la biblioteca — requerida para publicar)</span>
              </label>
              <input value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                placeholder="Qué hace este agente en 1-2 frases" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Ícono</label>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {ICON_CHOICES.map((i) => (
                  <button type="button" key={i} onClick={() => { setIcon(i); markDirty(); }}
                    style={{
                      fontSize: 17, width: 36, height: 36, display: "grid", placeItems: "center",
                      borderRadius: 9, cursor: "pointer",
                      border: `1px solid ${icon === i ? "#22d3ee" : "var(--border-soft)"}`,
                      background: icon === i ? "rgba(34,211,238,0.15)" : "transparent",
                    }}>{i}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 2 · Instrucciones */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase" }}>
                2 · Instrucciones (system prompt)
              </div>
              <span style={{
                fontSize: 11,
                color: instrLen > MAX_INSTRUCTIONS ? "#ef4444" : instrLen < MIN_INSTRUCTIONS ? "var(--text-dim)" : "#34d399",
              }}>
                {instrLen}/{MAX_INSTRUCTIONS}
              </span>
            </div>
            <textarea
              value={instructions}
              onChange={(e) => { setInstructions(e.target.value); markDirty(); }}
              rows={11}
              placeholder={"Describí en lenguaje natural cómo debe comportarse el agente.\n\nEj: Eres un consultor senior experto en cierres mensuales FI para clientes chilenos. Siempre pides el período y la sociedad. Respondes con la transacción exacta y los pasos numerados…"}
              style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.55 }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 8 }}>
              💡 Tips: definí rol + tono + qué datos pedir + cuándo derivar a otro especialista. El agente hereda
              automáticamente la base de conocimiento del tenant (RAG) y el rate limiting.
            </div>
          </div>

          {/* 3 · Modelo de IA */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 10 }}>
              3 · Modelo de IA
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {AGENT_MODELS.map((m) => {
                const active = model === m.id;
                const avail = modelsAvail[m.id];
                return (
                  <button type="button" key={m.id} onClick={() => { setModel(m.id); markDirty(); }}
                    style={{
                      textAlign: "left", padding: 12, borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${active ? "#22d3ee" : "var(--border-soft)"}`,
                      background: active ? "rgba(34,211,238,0.1)" : "transparent",
                      opacity: avail && !avail.available ? 0.75 : 1,
                    }}>
                    <div className="row between" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: active ? "#22d3ee" : "inherit" }}>{m.label}</span>
                      {active && <span style={{ color: "#22d3ee", fontSize: 13 }}>●</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>{m.tag}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-soft)", lineHeight: 1.45, marginBottom: 6 }}>{m.description}</div>
                    {avail && (
                      avail.available
                        ? <span style={{ fontSize: 10.5, color: "#34d399" }}>✓ Disponible</span>
                        : <span style={{ fontSize: 10.5, color: "#fbbf24" }} title={avail.reason}>⚠ Requiere configuración</span>
                    )}
                  </button>
                );
              })}
            </div>
            {model.startsWith("claude-") && modelsAvail[model] && !modelsAvail[model].available && (
              <div style={{
                fontSize: 11.5, marginTop: 10, padding: "8px 12px", borderRadius: 8,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24",
              }}>
                ⚠ {modelsAvail[model].reason}. Podés guardar el agente igual — funcionará apenas
                se agregue la key (los modelos Claude tienen costo por uso).
              </div>
            )}
          </div>

          {/* 4 · Base de conocimiento */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 10 }}>
              4 · Base de conocimiento (módulos que prioriza el RAG)
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {AGENT_CATEGORIES.filter((c) => c !== "GENERAL").map((m) => (
                <button type="button" key={m} onClick={() => toggleKbModule(m)}
                  style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                    border: `1px solid ${kbModules.includes(m) ? "#22d3ee" : "var(--border-soft)"}`,
                    background: kbModules.includes(m) ? "rgba(34,211,238,0.15)" : "transparent",
                    color: kbModules.includes(m) ? "#22d3ee" : "var(--text-soft)",
                  }}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════ Columna panel ══════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 12 }}>
          {/* Acciones */}
          <div className="card" style={{ padding: 16 }}>
            {error && <div className="alert error" style={{ fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
            {notice && !error && (
              <div style={{
                fontSize: 12.5, marginBottom: 10, padding: "8px 12px", borderRadius: 8,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399",
              }}>{notice}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn" onClick={() => save()} disabled={busy || (!dirty && !!agent)}
                style={{ width: "100%", justifyContent: "center" }}>
                {busy ? "Guardando…" : agent ? (dirty ? "💾 Guardar cambios" : "✓ Guardado") : "💾 Guardar borrador"}
              </button>
              {!isPublished ? (
                <button className="btn primary" onClick={handlePublish} disabled={busy}
                  style={{ width: "100%", justifyContent: "center" }}>
                  🚀 Publicar al equipo
                </button>
              ) : (
                <button className="btn ghost" onClick={handleUnpublish} disabled={busy}
                  style={{ width: "100%", justifyContent: "center", color: "#fbbf24" }}>
                  ↩ Volver a borrador
                </button>
              )}
              {agent && (
                <button className="btn ghost" onClick={() => router.push(`/agent-chat/${agent.id}`)}
                  style={{ width: "100%", justifyContent: "center", fontSize: 12.5 }}>
                  💬 Abrir chat completo
                </button>
              )}
            </div>
            {isPublished && agent?.publishedAt && (
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10, textAlign: "center" }}>
                Publicado el {new Date(agent.publishedAt).toLocaleDateString("es-CL")} por {agent.publishedBy}
              </div>
            )}
          </div>

          {/* Vista previa card */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 10 }}>
              Vista previa en la biblioteca
            </div>
            <div style={{ border: "1px solid var(--border-soft)", borderRadius: 12, padding: 14 }}>
              <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{
                  fontSize: 20, width: 38, height: 38, display: "grid", placeItems: "center",
                  borderRadius: 10, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
                }}>{icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name || "Nombre del agente"}</div>
                  <div className="row" style={{ gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    <Badge variant="muted">{category}</Badge>
                    {isPublished ? <Badge variant="ok">👥 Equipo</Badge> : <Badge variant="info">📝 Borrador</Badge>}
                    <Badge variant="muted">🧠 {modelLabel(model)}</Badge>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                {description || <span style={{ color: "var(--text-dim)" }}>La descripción aparece aquí…</span>}
              </div>
            </div>
          </div>

          {/* Playground */}
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column" }}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase" }}>
                🧪 Playground de prueba
              </div>
              <button type="button" onClick={toggleCompare}
                style={{
                  background: "none", cursor: "pointer", fontSize: 11, padding: "3px 10px", borderRadius: 14,
                  border: `1px solid ${compareOpen ? "#a78bfa" : "var(--border-soft)"}`,
                  color: compareOpen ? "#a78bfa" : "var(--text-dim)",
                }}>
                ⚔ Comparar modelos
              </button>
            </div>
            <div style={{
              minHeight: 160, maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column",
              gap: 8, marginBottom: 10, padding: "4px 2px",
            }}>
              {pgMessages.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", margin: "auto 0", padding: "30px 10px" }}>
                  Probá tu agente antes de publicarlo.
                  {(!agent || dirty) && <div style={{ marginTop: 6 }}>Al enviar, se guarda el borrador automáticamente.</div>}
                </div>
              )}
              {pgMessages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%", padding: "8px 12px", borderRadius: 12, fontSize: 12.5, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: m.role === "user" ? "rgba(34,211,238,0.14)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${m.role === "user" ? "rgba(34,211,238,0.3)" : "var(--border-soft)"}`,
                }}>
                  {m.content}
                  {m.meta && <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 5 }}>{m.meta}</div>}
                </div>
              ))}
              {pgBusy && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>El agente está pensando…</div>}
              <div ref={pgEndRef} />
            </div>
            <form onSubmit={sendPlayground} className="row" style={{ gap: 6 }}>
              <input
                value={pgInput}
                onChange={(e) => setPgInput(e.target.value)}
                placeholder="Mensaje de prueba…"
                disabled={pgBusy}
                style={{ flex: 1, fontSize: 12.5 }}
              />
              <button type="submit" className="btn sm primary" disabled={pgBusy || !pgInput.trim()}>➤</button>
            </form>

            {/* Onda 5 · Comparador de modelos */}
            {compareOpen && (
              <div style={{ borderTop: "1px solid var(--border-soft)", marginTop: 14, paddingTop: 12 }}>
                <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginBottom: 8 }}>
                  Mismo mensaje, dos modelos lado a lado — ideal para decidir si tu agente amerita Claude.
                </div>
                <form onSubmit={runCompare} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="row" style={{ gap: 6, alignItems: "center", fontSize: 12 }}>
                    <Badge variant="muted">{modelLabel(model)}</Badge>
                    <span style={{ color: "var(--text-dim)" }}>vs</span>
                    <select value={compareModel2} onChange={(e) => setCompareModel2(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                      {AGENT_MODELS.filter((m) => m.id !== model).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}{modelsAvail[m.id] && !modelsAvail[m.id].available ? " (⚠ sin key)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <input
                      value={compareMsg}
                      onChange={(e) => setCompareMsg(e.target.value)}
                      placeholder="Mensaje para ambos modelos…"
                      disabled={compareBusy}
                      style={{ flex: 1, fontSize: 12.5 }}
                    />
                    <button type="submit" className="btn sm" disabled={compareBusy || !compareMsg.trim() || !compareModel2}
                      style={{ borderColor: "#a78bfa", color: "#a78bfa" }}>
                      {compareBusy ? "…" : "⚔"}
                    </button>
                  </div>
                </form>
                {compareBusy && (
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>
                    Ejecutando ambos modelos en paralelo…
                  </div>
                )}
                {compareResults && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {compareResults.map((res) => (
                      <div key={res.model} style={{
                        border: `1px solid ${res.error ? "rgba(239,68,68,0.35)" : "var(--border-soft)"}`,
                        borderRadius: 10, padding: 10,
                      }}>
                        <div className="row between" style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>🧠 {modelLabel(res.model)}</span>
                          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>⏱ {(res.durationMs / 1000).toFixed(1)}s</span>
                        </div>
                        {res.error ? (
                          <div style={{ fontSize: 12, color: "#ef4444" }}>⚠ {res.error}</div>
                        ) : (
                          <div style={{
                            fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5,
                            whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflowY: "auto",
                          }}>{res.response}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Onda 5 · Historial de versiones */}
          {agent && (
            <div className="card" style={{ padding: 16 }}>
              <button type="button" onClick={() => setShowVersions((s) => !s)}
                className="row between"
                style={{ width: "100%", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
                <span style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--text-dim)", textTransform: "uppercase" }}>
                  🕘 Historial de versiones ({versions.length})
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{showVersions ? "▾" : "▸"}</span>
              </button>
              {showVersions && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {versions.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      Aún no hay versiones — se crean automáticamente cada vez que guardás cambios.
                    </div>
                  )}
                  {versions.map((v) => (
                    <div key={v.id} className="row between" style={{
                      border: "1px solid var(--border-soft)", borderRadius: 9, padding: "8px 10px",
                      alignItems: "center", gap: 8,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                          {new Date(v.savedAt).toLocaleString("es-CL")} · 🧠 {modelLabel(v.model)} · {v.instructions.length} chars
                        </div>
                      </div>
                      <button type="button" className="btn sm ghost" disabled={restoreBusy !== null}
                        onClick={() => handleRestore(v)} style={{ fontSize: 11, flexShrink: 0 }}>
                        {restoreBusy === v.id ? "…" : "↩ Restaurar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentBuilderPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Cargando…</div>}>
      <AgentBuilderInner />
    </Suspense>
  );
}
