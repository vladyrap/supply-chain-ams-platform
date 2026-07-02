"use client";

// =============================================================================
// /agent-studio — v1.3 Agent Hub
// =============================================================================
// Estudio de creación estilo IBM Consulting Advantage:
//   - Hero con 2 caminos: "Crear un Agente o Asistente" | "Crear una App Agéntica"
//   - Modal de creación (Name + Category + Description) → form completo
//     (instrucciones en lenguaje natural + módulos KB + visibilidad)
// =============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  createAgent, AGENT_CATEGORIES,
} from "@/services/custom-agents.api";

const ICON_CHOICES = ["🤖", "📦", "🛒", "🏭", "💰", "📊", "🔗", "🏗️", "🧠", "⚡", "🛠️", "📋"];

export default function AgentStudioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [kbModules, setKbModules] = useState<string[]>([]);
  const [icon, setIcon] = useState("🤖");
  const [visibility, setVisibility] = useState<"private" | "team" | "public">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName(""); setCategory("GENERAL"); setDescription("");
    setInstructions(""); setKbModules([]); setIcon("🤖");
    setVisibility("private"); setError(null);
  }

  function toggleKbModule(m: string) {
    setKbModules((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!instructions.trim() || instructions.trim().length < 30) {
      setError("Las instrucciones deben tener al menos 30 caracteres — describí qué hace el agente y cómo debe responder.");
      return;
    }
    setBusy(true);
    const r = await createAgent({
      name: name.trim(),
      category,
      description: description.trim(),
      instructions: instructions.trim(),
      kbModules,
      icon,
      visibility,
      createdBy: user?.email ?? user?.name ?? null,
    });
    setBusy(false);
    if (r.success) {
      setModalOpen(false);
      resetForm();
      router.push(`/agent-chat/${r.agent.id}`);
    } else {
      setError(r.error);
    }
  }

  return (
    <div>
      {/* Hero estilo IBM */}
      <div style={{
        borderRadius: 14, padding: "36px 32px", marginBottom: 20,
        background: "linear-gradient(135deg, rgba(29,42,110,0.9), rgba(34,63,158,0.75))",
        border: "1px solid rgba(91,141,239,0.35)",
      }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>🧪 Agent Studio</h1>
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 14, maxWidth: 720 }}>
          Diseñá, construí y publicá agentes inteligentes para potenciar la operación AMS.
          Creá para vos y para todo el equipo.
        </p>
      </div>

      {/* Dos caminos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Crear un Agente o Asistente</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              Creá un agente describiendo en lenguaje natural qué querés que haga.
              Podés asignarle módulos de la base de conocimiento para que responda con
              el contexto de tu operación. Sin código.
            </p>
          </div>
          <button
            className="btn primary"
            onClick={() => setModalOpen(true)}
            style={{ borderRadius: 0, padding: "14px 20px", justifyContent: "space-between", display: "flex", width: "100%" }}
          >
            <span>Comenzar</span><span>→</span>
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", opacity: 0.75 }}>
          <div style={{ padding: 20, flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Crear una App Agéntica</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              Construí aplicaciones que orquestan múltiples agentes en workflows autónomos
              para resolver procesos completos — planifican, coordinan y ejecutan tareas
              entre sistemas.
            </p>
          </div>
          <button
            className="btn ghost"
            disabled
            title="Disponible en la próxima versión"
            style={{ borderRadius: 0, padding: "14px 20px", justifyContent: "space-between", display: "flex", width: "100%" }}
          >
            <span>Próximamente</span><span>🔒</span>
          </button>
        </div>
      </div>

      {/* Modal creación — estilo IBM (Name + Category + Description + instrucciones) */}
      {modalOpen && (
        <div
          onClick={() => !busy && setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
            display: "grid", placeItems: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: 24 }}
          >
            <div className="row between" style={{ marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Crear nuevo agente</h2>
              <button onClick={() => setModalOpen(false)} disabled={busy}
                style={{ background: "none", border: 0, color: "var(--text-dim)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-soft)" }}>
              Poné un nombre, elegí categoría y describí el objetivo para crear tu agente.
            </p>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}>
                <div>
                  <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Nombre *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Asistente de cierres FI"
                    required
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Categoría</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%" }}>
                    {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Descripción corta</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lo que ven los demás en la biblioteca (1-2 frases)"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                  Instrucciones del agente * <span style={{ color: "var(--text-dim)" }}>(en lenguaje natural — es el cerebro del agente)</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={"Ej: Eres un consultor experto en cierres mensuales FI. Cuando te pregunten por un paso del cierre, respondes con la transacción exacta, los pre-requisitos y los errores comunes. Siempre verificas que el período esté abierto antes de proponer contabilizaciones…"}
                  rows={7}
                  required
                  style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                    Base de conocimiento <span style={{ color: "var(--text-dim)" }}>(módulos que consulta)</span>
                  </label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {AGENT_CATEGORIES.filter((c) => c !== "GENERAL").map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleKbModule(m)}
                        style={{
                          fontSize: 11.5, padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                          border: `1px solid ${kbModules.includes(m) ? "#22d3ee" : "var(--border-soft)"}`,
                          background: kbModules.includes(m) ? "rgba(34,211,238,0.15)" : "transparent",
                          color: kbModules.includes(m) ? "#22d3ee" : "var(--text-soft)",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="admin-form-label" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Ícono + visibilidad</label>
                  <div className="row" style={{ gap: 8 }}>
                    <select value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 70, fontSize: 16 }}>
                      {ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <select value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)} style={{ flex: 1 }}>
                      <option value="private">🔒 Privado (solo yo)</option>
                      <option value="team">👥 Equipo</option>
                      <option value="public">🌐 Público (todo el tenant)</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && <div className="alert error" style={{ fontSize: 12.5 }}>{error}</div>}

              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" disabled={busy} style={{ marginLeft: "auto" }}>
                  {busy ? "Creando…" : "Crear agente →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
