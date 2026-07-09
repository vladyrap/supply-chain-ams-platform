"use client";

import { useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";

interface Props {
  testing: UseTestingIntelligence;
}

export default function UserManualGenerator({ testing }: Props) {
  const [scenarioId, setScenarioId] = useState<string>(testing.scenarios[0]?.id || "");
  const [content, setContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<"es" | "en" | "pt">(testing.settings.manualLanguage);
  const [audience, setAudience] = useState("Usuarios finales SAP");
  const [supportContact, setSupportContact] = useState("Mesa AMS · soporte.ams@demo.cl · interno 4000");

  function generate() {
    if (!scenarioId) return;
    const m = testing.generateManual(scenarioId, { language, audience, supportContact });
    if (m) setContent(m.contentMarkdown);
  }

  async function copy() {
    if (!content) return;
    try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  function download() {
    if (!content || !scenarioId) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenarioId}-manual.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario base</label>
            <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); setContent(""); }} style={{ width: "100%" }}>
              <option value="">— elegir —</option>
              {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.sapModule}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as "es" | "en" | "pt")} style={{ width: 100 }}>
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Público objetivo</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Contacto de soporte</label>
            <input value={supportContact} onChange={(e) => setSupportContact(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn primary" onClick={generate} disabled={!scenarioId}>📖 Generar manual</button>
          <button className="btn ghost" onClick={copy} disabled={!content}>{copied ? "✓ Copiado" : "📋 Copiar"}</button>
          <button className="btn ghost" onClick={download} disabled={!content}>⬇ Descargar .md</button>
        </div>
      </div>

      {content && (
        <div className="card" style={{ background: "rgba(15,23,42,0.5)" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Manual generado
          </div>
          <pre style={{
            margin: 0, padding: "10px 12px",
            background: "rgba(0,0,0,0.30)", borderRadius: 6,
            fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, lineHeight: 1.55,
            color: "#5b6b7d", maxHeight: 520, overflow: "auto", whiteSpace: "pre-wrap",
          }}>{content}</pre>
        </div>
      )}
    </div>
  );
}
