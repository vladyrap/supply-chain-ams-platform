"use client";

import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestingSettings } from "@/types/testing";

export default function TestingSettingsPanel({ testing, canConfigure }: { testing: UseTestingIntelligence; canConfigure: boolean }) {
  const s = testing.settings;
  const disabled = !canConfigure;

  function set<K extends keyof TestingSettings>(key: K, value: TestingSettings[K]) {
    testing.updateSettings({ [key]: value } as Partial<TestingSettings>);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>⚙ Requisitos para aprobar pruebas</h3>
        <div className="col" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.requireEvidenceToApprove}
              onChange={(e) => set("requireEvidenceToApprove", e.target.checked)} />
            Requiere al menos una evidencia para aprobar.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.requireOwner}
              onChange={(e) => set("requireOwner", e.target.checked)} />
            Requiere responsable definido.
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.requireScopeItem}
              onChange={(e) => set("requireScopeItem", e.target.checked)} />
            Requiere al menos un Scope Item asociado.
          </label>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>🎥 Captura de evidencias</h3>
        <div className="col" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.allowScreenRecording}
              onChange={(e) => set("allowScreenRecording", e.target.checked)} />
            Permitir grabación de pantalla (requiere navegador compatible).
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.allowVideoUpload}
              onChange={(e) => set("allowVideoUpload", e.target.checked)} />
            Permitir carga local de video (sin upload a backend).
          </label>
          <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" disabled={disabled} checked={s.warnSensitiveData}
              onChange={(e) => set("warnSensitiveData", e.target.checked)} />
            Mostrar advertencia de datos sensibles al grabar.
          </label>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>📄 Formato y exportación</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Plantilla por defecto</label>
            <select disabled={disabled} value={s.defaultTemplate} onChange={(e) => set("defaultTemplate", e.target.value as TestingSettings["defaultTemplate"])} style={{ width: "100%" }}>
              <option value="STANDARD">Standard</option>
              <option value="DETAILED">Detallada</option>
              <option value="COMPACT">Compacta</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Formato exportación</label>
            <select disabled={disabled} value={s.exportFormat} onChange={(e) => set("exportFormat", e.target.value as TestingSettings["exportFormat"])} style={{ width: "100%" }}>
              <option value="MARKDOWN">Markdown</option>
              <option value="JSON">JSON</option>
              <option value="BOTH">Ambos</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Idioma del manual</label>
            <select disabled={disabled} value={s.manualLanguage} onChange={(e) => set("manualLanguage", e.target.value as TestingSettings["manualLanguage"])} style={{ width: "100%" }}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>🎬 Modo demo</h3>
        <label className="row" style={{ gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" disabled={disabled} checked={s.demoMode} onChange={(e) => set("demoMode", e.target.checked)} />
          Marcar todos los escenarios como demo (sin envío real ni acciones destructivas).
        </label>
      </div>

      {canConfigure && (
        <div className="card" style={{ background: "rgba(250,77,86,0.05)", borderColor: "rgba(250,77,86,0.25)" }}>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
            Restaurar datos demo (escenarios, evidencias, defectos, manuales y settings).
          </div>
          <button className="btn ghost"
            style={{ marginTop: 8, borderColor: "rgba(250,77,86,0.5)", color: "#fca5a5" }}
            onClick={() => { if (confirm("¿Restaurar datos demo de testing? Esto sobrescribe lo actual.")) testing.resetDemoTestingData(); }}>
            ↻ Restaurar demo
          </button>
        </div>
      )}
    </div>
  );
}
