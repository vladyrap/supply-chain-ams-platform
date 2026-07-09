"use client";

import { useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import { SAP_MODULES } from "@/types/training";

interface Props { ctx: UseAgentTraining }

export default function TrainingSettingsPanel({ ctx }: Props) {
  const { settings } = ctx;
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function toggleModule(m: string) {
    const next = settings.activeModules.includes(m)
      ? settings.activeModules.filter((x) => x !== m)
      : [...settings.activeModules, m];
    ctx.updateSettings({ activeModules: next });
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>⚙</span> POLÍTICAS DE PUBLICACIÓN
        </div>
        <div className="col" style={{ gap: 12 }}>
          <label className="tc-setting">
            <div>
              <strong>Umbral mínimo de score para publicar</strong>
              <p>Ítems con score por debajo de este valor no pueden ser publicados.</p>
            </div>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <input type="range" min={0} max={100} step={5} value={settings.minScoreToPublish}
                onChange={(e) => ctx.updateSettings({ minScoreToPublish: Number(e.target.value) })} />
              <span style={{ minWidth: 36, fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                {settings.minScoreToPublish}
              </span>
            </div>
          </label>

          <label className="tc-setting">
            <div>
              <strong>Requiere validación funcional</strong>
              <p>El ítem debe ser aprobado por un consultor funcional antes de publicarse.</p>
            </div>
            <input type="checkbox" checked={settings.requireFunctionalValidation}
              onChange={(e) => ctx.updateSettings({ requireFunctionalValidation: e.target.checked })} />
          </label>

          <label className="tc-setting">
            <div>
              <strong>Requiere validación técnica</strong>
              <p>El ítem debe ser aprobado por un técnico/líder antes de publicarse.</p>
            </div>
            <input type="checkbox" checked={settings.requireTechnicalValidation}
              onChange={(e) => ctx.updateSettings({ requireTechnicalValidation: e.target.checked })} />
          </label>

          <label className="tc-setting">
            <div>
              <strong>Permitir publicación automática</strong>
              <p>Si un ítem cumple todas las reglas, se publica sin pedir confirmación.</p>
            </div>
            <input type="checkbox" checked={settings.allowAutoPublish}
              onChange={(e) => ctx.updateSettings({ allowAutoPublish: e.target.checked })} />
          </label>

          <label className="tc-setting">
            <div>
              <strong>Modo estricto anti-alucinación</strong>
              <p>Cuando el agente tiene confianza baja, sugiere derivar a humano antes de responder.</p>
            </div>
            <input type="checkbox" checked={settings.strictMode}
              onChange={(e) => ctx.updateSettings({ strictMode: e.target.checked })} />
          </label>
        </div>
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🗂</span> MÓDULOS ACTIVOS
        </div>
        <p className="settings-section-desc">El agente solo usará conocimiento de los módulos seleccionados.</p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {SAP_MODULES.map((m) => {
            const active = settings.activeModules.includes(m);
            return (
              <button key={m} onClick={() => toggleModule(m)}
                className={`ticket-filter ${active ? "active" : ""}`}
                style={{ ["--filt-color" as never]: active ? "#10b981" : "#64748b" }}>
                {active ? "✓ " : ""}{m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🌐</span> IDIOMA Y FORMATO
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <label className="tc-field" style={{ flex: 1, minWidth: 160 }}>
            <span>Idioma principal</span>
            <select value={settings.mainLanguage} onChange={(e) => ctx.updateSettings({ mainLanguage: e.target.value as "es" | "en" })}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="tc-field" style={{ flex: 1, minWidth: 200 }}>
            <span>Formato de respuesta</span>
            <select value={settings.responseFormat} onChange={(e) => ctx.updateSettings({ responseFormat: e.target.value as never })}>
              <option value="concise">Conciso</option>
              <option value="structured">Estructurado</option>
              <option value="narrative">Narrativo</option>
            </select>
          </label>
          <label className="tc-field" style={{ flex: 1, minWidth: 220 }}>
            <span>Retención de versiones</span>
            <input type="number" min={1} max={50} value={settings.versionRetention}
              onChange={(e) => ctx.updateSettings({ versionRetention: Number(e.target.value) })} />
          </label>
        </div>
      </div>

      <div className="card" style={{ borderLeft: "3px solid #fa4d56" }}>
        <div className="ticket-section-head">
          <span style={{ color: "#fa4d56" }}>⚠</span> ZONA DE RIESGO
        </div>
        <p className="settings-section-desc">
          Reset de datos demo: borra los <b>ítems</b>, Q&A, versiones, brechas y settings del entrenamiento.
          No afecta usuarios, roles ni el chat del agente.
        </p>
        {!confirmReset ? (
          <button className="btn ghost" onClick={() => setConfirmReset(true)} style={{ borderColor: "#fa4d56", color: "#da1e28" }}>
            ♻ Restaurar datos demo
          </button>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" style={{ background: "#fa4d56", borderColor: "#fa4d56" }}
              onClick={() => {
                ctx.resetDemoTrainingData();
                setConfirmReset(false);
                showToast("Demo de entrenamiento restaurada.");
              }}>
              ✓ Sí, restaurar
            </button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}
