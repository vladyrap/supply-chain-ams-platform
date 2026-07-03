"use client";

// =============================================================================
// AppsStudioView — tab ⚙️ Apps Agénticas del módulo único /agent-hub (v1.3 onda 5.1)
// =============================================================================
// Estudio de creación estilo IBM Consulting Advantage:
//   - Camino 1: Crear un Agente (form no-code con instrucciones)
//   - Camino 2: Crear una App Agéntica (pipeline de hasta 4 agentes)
//   - Mis Apps: lista con Ejecutar / Eliminar
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import {
  listAgents, createApp, listApps, deleteApp, duplicateApp,
  type CustomAgent, type AgenticApp, type AppStep,
} from "@/services/custom-agents.api";

const APP_ICONS = ["⚙️", "🚀", "🧩", "🔄", "🎯", "🛰️", "🗓️", "📈"];
const MAX_STEPS = 4;

export function AppsStudioView() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.email ?? user?.name ?? null;

  // ── Modal App Agéntica ──
  const [appModal, setAppModal] = useState(false);
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [appIcon, setAppIcon] = useState("⚙️");
  const [steps, setSteps] = useState<AppStep[]>([{ agentId: "", instruction: "", name: "" }]);
  const [appBusy, setAppBusy] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // ── Mis Apps ──
  const [apps, setApps] = useState<AgenticApp[]>([]);

  const loadApps = useCallback(async () => {
    const r = await listApps();
    if (r.success) setApps(r.apps);
  }, []);
  const loadAgents = useCallback(async () => {
    // forUser: permite armar pipelines también con tus borradores privados
    const r = await listAgents(userId ? { forUser: userId } : {});
    if (r.success) setAgents(r.agents);
  }, [userId]);

  useEffect(() => { loadApps(); loadAgents(); }, [loadApps, loadAgents]);

  // ── Crear App ──
  function updateStep(i: number, patch: Partial<AppStep>) {
    setSteps((cur) => cur.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }
  function addStep() {
    if (steps.length < MAX_STEPS) setSteps((cur) => [...cur, { agentId: "", instruction: "", name: "" }]);
  }
  function removeStep(i: number) {
    setSteps((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function handleCreateApp(e: React.FormEvent) {
    e.preventDefault();
    setAppError(null);
    if (!appName.trim()) { setAppError("El nombre es obligatorio"); return; }
    if (steps.some((s) => !s.agentId)) { setAppError("Todos los pasos necesitan un agente asignado"); return; }
    setAppBusy(true);
    const r = await createApp({
      name: appName.trim(),
      description: appDescription.trim(),
      steps: steps.map((s, i) => ({
        ...s,
        name: s.name?.trim() || agents.find((a) => a.id === s.agentId)?.name || `Paso ${i + 1}`,
      })),
      icon: appIcon,
      createdBy: userId,
    });
    setAppBusy(false);
    if (r.success) {
      setAppModal(false);
      setAppName(""); setAppDescription(""); setSteps([{ agentId: "", instruction: "", name: "" }]);
      router.push(`/agentic-apps/${r.app.id}`);
    } else setAppError(r.error);
  }

  async function handleDeleteApp(app: AgenticApp) {
    if (!window.confirm(`¿Eliminar la app "${app.name}"?`)) return;
    const r = await deleteApp(app.id);
    if (r.success) loadApps();
    else window.alert(r.error);
  }

  async function handleDuplicateApp(app: AgenticApp) {
    const r = await duplicateApp(app.id, userId ?? undefined);
    if (r.success) loadApps();
    else window.alert(r.error);
  }

  return (
    <div>
      {/* Hero */}
      <div style={{
        borderRadius: 14, padding: "36px 32px", marginBottom: 20,
        background: "linear-gradient(135deg, rgba(29,42,110,0.9), rgba(34,63,158,0.75))",
        border: "1px solid rgba(91,141,239,0.35)",
      }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>🧪 Agent Studio</h1>
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 14, maxWidth: 720 }}>
          Diseñá, construí y publicá agentes inteligentes y apps que los orquestan.
          Creá para vos y para todo el equipo.
        </p>
      </div>

      {/* Dos caminos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Crear un Agente o Asistente</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              Abrí el Agent Builder: diseñá tu agente en lenguaje natural, probalo en el
              playground y publicalo para todo el equipo cuando esté listo.
            </p>
          </div>
          <button className="btn primary" onClick={() => router.push("/agent-hub?tab=builder")}
            style={{ borderRadius: 0, padding: "14px 20px", justifyContent: "space-between", display: "flex", width: "100%" }}>
            <span>Abrir Agent Builder</span><span>→</span>
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, flex: 1 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Crear una App Agéntica</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6 }}>
              Encadená hasta {MAX_STEPS} agentes en un pipeline: el output de cada paso
              alimenta al siguiente. Ideal para procesos completos (analizar → redactar → validar).
            </p>
          </div>
          <button className="btn primary" onClick={() => setAppModal(true)}
            style={{ borderRadius: 0, padding: "14px 20px", justifyContent: "space-between", display: "flex", width: "100%", background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
            <span>Comenzar</span><span>→</span>
          </button>
        </div>
      </div>

      {/* Mis Apps */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Mis Apps ({apps.length})</h2>
      </div>
      {apps.length === 0 ? (
        <div className="card" style={{ padding: 26, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
          Aún no creaste apps agénticas. Usá &quot;Crear una App Agéntica&quot; para armar tu primer pipeline.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {apps.map((app) => (
            <div key={app.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <span style={{
                  fontSize: 22, width: 40, height: 40, display: "grid", placeItems: "center",
                  borderRadius: 10, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)",
                }}>{app.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{app.name}</div>
                  <div className="row" style={{ gap: 6, marginTop: 3 }}>
                    <Badge variant="muted">{app.steps.length} paso{app.steps.length > 1 ? "s" : ""}</Badge>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>▶ {app.runCount} runs</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-soft)", flex: 1 }}>
                {app.description || "Sin descripción."}
              </div>
              <div className="row between" style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <button onClick={() => handleDeleteApp(app)} title="Eliminar"
                    style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, color: "#ef4444" }}>🗑</button>
                  <button onClick={() => handleDuplicateApp(app)} title="Duplicar como plantilla"
                    style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, color: "var(--text-dim)" }}>⧉</button>
                </div>
                <button className="btn sm primary" onClick={() => router.push(`/agentic-apps/${app.id}`)}>
                  ▶ Ejecutar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═════════ Modal Crear App Agéntica ═════════ */}
      {appModal && (
        <div onClick={() => !appBusy && setAppModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card"
            style={{ width: "min(820px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Crear App Agéntica</h2>
              <button onClick={() => setAppModal(false)} disabled={appBusy}
                style={{ background: "none", border: 0, color: "var(--text-dim)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-soft)" }}>
              Encadená agentes: el input del usuario entra al paso 1, y el output de cada paso alimenta al siguiente.
            </p>
            <form onSubmit={handleCreateApp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Nombre *</label>
                  <input value={appName} onChange={(e) => setAppName(e.target.value)}
                    placeholder="Ej: Analizar incidente y redactar respuesta al cliente" required style={{ width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Ícono</label>
                  <select value={appIcon} onChange={(e) => setAppIcon(e.target.value)} style={{ width: "100%", fontSize: 16 }}>
                    {APP_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Descripción</label>
                <input value={appDescription} onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Qué logra esta app" style={{ width: "100%" }} />
              </div>

              {/* Builder de pasos */}
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                  Pipeline ({steps.length}/{MAX_STEPS} pasos)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {steps.map((s, i) => (
                    <div key={i} className="card flat" style={{ padding: 12, border: "1px solid var(--border-soft)" }}>
                      <div className="row between" style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
                          {i === 0 ? "▶ Paso 1 (recibe el input del usuario)" : `⤷ Paso ${i + 1} (recibe el output del paso ${i})`}
                        </span>
                        {steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(i)}
                            style={{ background: "none", border: 0, cursor: "pointer", color: "#ef4444", fontSize: 12 }}>quitar</button>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 10 }}>
                        <select value={s.agentId} onChange={(e) => updateStep(i, { agentId: e.target.value })} required>
                          <option value="">— Elegir agente —</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                          ))}
                        </select>
                        <input
                          value={s.instruction}
                          onChange={(e) => updateStep(i, { instruction: e.target.value })}
                          placeholder="Instrucción del paso (ej: 'Redactá una respuesta formal al cliente con este análisis')"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {steps.length < MAX_STEPS && (
                  <button type="button" className="btn ghost" onClick={addStep} style={{ marginTop: 10, fontSize: 12.5 }}>
                    ＋ Agregar paso
                  </button>
                )}
              </div>

              {appError && <div className="alert error" style={{ fontSize: 12.5 }}>{appError}</div>}
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button type="button" className="btn ghost" onClick={() => setAppModal(false)} disabled={appBusy}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={appBusy} style={{ marginLeft: "auto" }}>
                  {appBusy ? "Creando…" : "Crear app →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
