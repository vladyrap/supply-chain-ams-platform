"use client";

// =============================================================================
// Refactor Z → Clean Core (HANA)
// =============================================================================
// 1) Análisis estático heurístico (instantáneo, sin costo) con antes → después.
// 2) Refactor con IA (ROCCO): reescribe el código con el LLM elegido (Gemini/Claude).
// 3) Diff lado-a-lado original ↔ HANA + re-análisis (readiness antes → después).
// 4) Export (Markdown/CSV + .abap HANA con cabecera de notas) + crear ticket real.
// 5) Historial de refactors (localStorage) para revisitar sin re-llamar al LLM.
//
// Asistente de triage — la fuente formal sigue siendo ATC (variante cloud
// readiness) + Custom Code Migration.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { analyzeAbap, SAMPLE_ABAP, type AbapAnalysis, type AbapFinding } from "@/lib/clean-core/abap-analyzer";
import { SEVERITY_LABELS, SEVERITY_COLORS, bandForIndex } from "@/lib/clean-core/engine";
import {
  abapReportMarkdown, abapFindingsCsv, abapAnalysisToTicketInput,
  downloadText, extractAbapCode, buildHanaExport, lineDiff, type DiffRow,
} from "@/lib/clean-core/report";
import { refactorAbapWithAI } from "@/services/clean-core.api";
import { createTicket } from "@/services/tickets.api";
import { AGENT_MODELS, modelLabel } from "@/services/custom-agents.api";

const CATEGORY_COLORS: Record<string, string> = {
  "HANA performance": "var(--teal, #007d79)",
  "ABAP Cloud": "var(--magenta, #8a3ffc)",
  "Clean Core": "var(--accent, #0f62fe)",
  "Correctness": "#ff832b",
};

function CodeBlock({ label, code, color }: { label: string; code: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <pre style={{
        margin: 0, padding: "8px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.45,
        background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
        color: "var(--text)", fontFamily: "var(--font-mono, monospace)",
        overflowX: "auto", whiteSpace: "pre",
      }}>{code}</pre>
    </div>
  );
}

// Render Markdown ligero: separa bloques ``` y da formato a #, ##, ### y - .
function MarkdownLite({ text }: { text: string }) {
  const parts = text.split(/```/);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          const lines = p.replace(/^\n/, "").split("\n");
          const body = /^[a-zA-Z0-9_]+\s*$/.test(lines[0] ?? "") ? lines.slice(1).join("\n") : p.replace(/^\n/, "");
          return (
            <pre key={i} style={{
              margin: 0, padding: "10px 12px", borderRadius: 6, fontSize: 11.5, lineHeight: 1.5,
              background: "var(--bg-elev)", border: "1px solid var(--border-soft)",
              color: "var(--text)", fontFamily: "var(--font-mono, monospace)",
              overflowX: "auto", whiteSpace: "pre",
            }}>{body.replace(/\s+$/, "")}</pre>
          );
        }
        const lines = p.split("\n");
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {lines.map((ln, j) => {
              const t = ln.trimEnd();
              if (!t.trim()) return <div key={j} style={{ height: 2 }} />;
              if (/^#{1,3}\s/.test(t)) {
                const txt = t.replace(/^#{1,3}\s/, "");
                return <div key={j} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{txt}</div>;
              }
              if (/^[-*]\s/.test(t)) {
                return <div key={j} style={{ fontSize: 12.5, color: "var(--text-soft)", paddingLeft: 12, lineHeight: 1.5 }}>• {t.replace(/^[-*]\s/, "")}</div>;
              }
              return <div key={j} style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{t}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// Diff lado-a-lado: dos columnas alineadas fila a fila (rows ya alineadas por LCS).
function DiffView({ rows }: { rows: DiffRow[] }) {
  const colStyle: React.CSSProperties = { fontFamily: "var(--font-mono, monospace)", fontSize: 11, lineHeight: 1.55 };
  const hdr: React.CSSProperties = { position: "sticky", top: 0, padding: "4px 8px", fontWeight: 700, borderBottom: "1px solid var(--border-soft)", background: "var(--bg-elev)" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--border-soft)", borderRadius: 6, overflow: "auto", maxHeight: 440 }}>
      <div style={{ ...colStyle, borderRight: "1px solid var(--border-soft)" }}>
        <div style={{ ...hdr, color: "var(--error)" }}>Original</div>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "0 8px", minHeight: 17, whiteSpace: "pre", color: "var(--text)", background: r.type === "del" ? "color-mix(in srgb, var(--error) 13%, transparent)" : "transparent" }}>{r.left ?? ""}</div>
        ))}
      </div>
      <div style={colStyle}>
        <div style={{ ...hdr, color: "var(--ok)" }}>Clean Core / HANA</div>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "0 8px", minHeight: 17, whiteSpace: "pre", color: "var(--text)", background: r.type === "add" ? "color-mix(in srgb, var(--ok) 15%, transparent)" : "transparent" }}>{r.right ?? ""}</div>
        ))}
      </div>
    </div>
  );
}

function FindingCard({ f }: { f: AbapFinding }) {
  const sc = SEVERITY_COLORS[f.severity];
  const cc = CATEGORY_COLORS[f.category] || "var(--text-dim)";
  return (
    <div className="card" style={{ borderLeft: `3px solid ${sc}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{f.title}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)" }}>línea {f.line}</span>
            <span style={{ color: cc, fontWeight: 700 }}>· {f.category}</span>
          </div>
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: sc, border: `1px solid ${sc}`,
          borderRadius: 4, padding: "1px 7px", textTransform: "uppercase", flexShrink: 0,
        }}>{SEVERITY_LABELS[f.severity]}</span>
      </div>

      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--text-soft)",
        background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: 4,
        padding: "4px 8px", overflowX: "auto", whiteSpace: "pre",
      }}>{f.snippet}</div>

      <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.45 }}>{f.problem}</div>
      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.45 }}>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>✔ </span>{f.recommendation}
      </div>

      {(f.before || f.after) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {f.before && <CodeBlock label="Antes (clásico)" code={f.before} color="var(--error)" />}
          {f.after && <CodeBlock label="Después (Clean Core / HANA)" code={f.after} color="var(--ok)" />}
        </div>
      )}

      {f.reference && <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>📎 {f.reference}</div>}
    </div>
  );
}

type TicketState = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; key: string } | { kind: "error"; msg: string };
type IaMeta = { source: string; beforeScore: number; afterScore: number; afterCloudReady: boolean };
type HistEntry = { ts: number; model: string; scoreBefore: number; scoreAfter: number; source: string; refactored: string };

const HKEY = "supply-chain-ams-clean-core-refactor-history";
function readHist(): HistEntry[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(HKEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function writeHist(list: HistEntry[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(HKEY, JSON.stringify(list)); } catch { /* */ }
}
function hhmm(ts: number): string {
  try { return new Date(ts).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function AbapRefactorView() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<AbapAnalysis | null>(null);
  const [model, setModel] = useState<string>("gemini-2.5-flash");

  // IA (ROCCO)
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);
  const [iaModelUsed, setIaModelUsed] = useState<string>("");
  const [iaMeta, setIaMeta] = useState<IaMeta | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  const [ticket, setTicket] = useState<TicketState>({ kind: "idle" });
  const [history, setHistory] = useState<HistEntry[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);

  // Historial: cargar post-mount (evita hydration mismatch por localStorage).
  useEffect(() => { setHistory(readHist()); }, []);

  function run(src: string) {
    setResult(analyzeAbap(src));
    setTicket({ kind: "idle" });
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) { setImportInfo("⚠ Archivo muy grande (máx 2 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCode(text);
      const over = text.length > 40000 ? " · el refactor IA sólo acepta 40.000 (el análisis funciona igual)" : "";
      setImportInfo(`📁 ${file.name} · ${text.length.toLocaleString("es-CL")} caracteres${over}`);
      run(text);
    };
    reader.onerror = () => setImportInfo("⚠ No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  async function runIA() {
    if (!code.trim()) return;
    setIaLoading(true); setIaError(null); setIaResult(null); setIaMeta(null); setShowDiff(false);
    const src = code;
    const r = await refactorAbapWithAI(src, model);
    setIaLoading(false);
    if (!r.ok) { setIaError(r.error); return; }
    const before = analyzeAbap(src);
    const after = analyzeAbap(extractAbapCode(r.refactored));
    setIaResult(r.refactored);
    setIaModelUsed(r.model);
    setIaMeta({ source: src, beforeScore: before.score, afterScore: after.score, afterCloudReady: after.cloudReady });
    const entry: HistEntry = { ts: Date.now(), model: r.model, scoreBefore: before.score, scoreAfter: after.score, source: src, refactored: r.refactored };
    setHistory((prev) => { const next = [entry, ...prev].slice(0, 10); writeHist(next); return next; });
  }

  function restore(h: HistEntry) {
    setCode(h.source);
    setResult(analyzeAbap(h.source));
    setIaResult(h.refactored);
    setIaModelUsed(h.model);
    setIaError(null);
    const after = analyzeAbap(extractAbapCode(h.refactored));
    setIaMeta({ source: h.source, beforeScore: h.scoreBefore, afterScore: h.scoreAfter, afterCloudReady: after.cloudReady });
    setShowDiff(false); setTicket({ kind: "idle" });
  }

  function clearHistory() {
    setHistory([]);
    if (typeof window !== "undefined") { try { localStorage.removeItem(HKEY); } catch { /* */ } }
  }

  async function createRemediationTicket() {
    if (!result) return;
    setTicket({ kind: "loading" });
    const r = await createTicket(abapAnalysisToTicketInput(result));
    if ("success" in r && r.success) setTicket({ kind: "ok", key: r.ticket.key });
    else setTicket({ kind: "error", msg: "error" in r ? r.error : "no se pudo crear" });
  }

  async function copyIA() {
    if (!iaResult || typeof navigator === "undefined") return;
    try { await navigator.clipboard.writeText(iaResult); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.5 }}>
          Pegá o <b>importá</b> un objeto <b>Z/Y</b> completo (.abap/.txt). El <b>análisis</b> es instantáneo y sin
          costo; el <b>refactor con IA (ROCCO)</b> reescribe el código con el LLM que elijas, ves el <b>diff</b> y el
          <b> score antes → después</b>, y podés <b>exportar la versión HANA</b> como archivo .abap. Asistente de
          triage — la fuente formal es <b>ATC</b> (variante cloud readiness) + <b>Custom Code Migration</b>.
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="* Pegá tu código ABAP aquí…&#10;REPORT z_mi_reporte.&#10;  SELECT * FROM mara INTO TABLE lt_mara."
          spellCheck={false}
          style={{
            width: "100%", minHeight: 200, padding: "10px 12px", borderRadius: 6,
            border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)",
            fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, lineHeight: 1.5, resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => run(code)} className="btn primary" disabled={!code.trim()} style={{ fontSize: 12.5 }}>
            🔍 Analizar
          </button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={model} onChange={(e) => setModel(e.target.value)} title="Modelo LLM"
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-panel)", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>
              {AGENT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button onClick={runIA} className="btn" disabled={!code.trim() || iaLoading}
              style={{ fontSize: 12.5, background: "var(--magenta, #8a3ffc)", color: "#fff", border: "none" }}>
              {iaLoading ? <><span className="spinner" /> ROCCO refactorizando…</> : "🤖 Refactorizar con IA (ROCCO)"}
            </button>
          </div>
          <button onClick={() => fileRef.current?.click()} className="btn ghost" style={{ fontSize: 12.5 }}>📁 Importar ABAP</button>
          <input ref={fileRef} type="file" accept=".abap,.txt,.prog,.inc,.clas,.asprog,.text,text/plain" onChange={onImportFile} style={{ display: "none" }} />
          <button onClick={() => { setCode(SAMPLE_ABAP); run(SAMPLE_ABAP); setImportInfo(null); }} className="btn ghost" style={{ fontSize: 12.5 }}>📄 Cargar ejemplo</button>
          <button onClick={() => { setCode(""); setResult(null); setIaResult(null); setIaError(null); setIaMeta(null); setTicket({ kind: "idle" }); setImportInfo(null); }} className="btn ghost" style={{ fontSize: 12.5 }}>✕ Limpiar</button>
        </div>
        {importInfo && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{importInfo}</div>}
      </div>

      {/* Historial de refactors */}
      {history.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>▸ HISTORIAL DE REFACTORS · {history.length}</div>
            <button onClick={clearHistory} className="btn ghost" style={{ fontSize: 11 }}>Vaciar</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 10px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)" }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)" }}>{hhmm(h.ts)}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{modelLabel(h.model)}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
                  {h.scoreBefore} → <b style={{ color: bandForIndex(h.scoreAfter).color }}>{h.scoreAfter}</b>
                  {h.scoreAfter > h.scoreBefore && <span style={{ color: "var(--ok)", fontWeight: 700 }}> ▲ +{h.scoreAfter - h.scoreBefore}</span>}
                </span>
                <button onClick={() => restore(h)} className="btn ghost" style={{ fontSize: 11, marginLeft: "auto" }}>↺ Restaurar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel refactor IA */}
      {(iaLoading || iaResult || iaError) && (
        <div className="card" style={{ borderLeft: "3px solid var(--magenta, #8a3ffc)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--magenta, #8a3ffc)" }}>
              🤖 Refactor ROCCO {iaModelUsed && <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>· {modelLabel(iaModelUsed)}</span>}
            </div>
            {iaResult && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => downloadText("refactor-hana.abap", buildHanaExport(iaResult), "text/plain;charset=utf-8;")}
                  className="btn"
                  style={{ fontSize: 11.5, background: "var(--teal, #007d79)", color: "#fff", border: "none" }}
                  title="Descargar el código refactorizado (Clean Core / HANA) con cabecera de notas de migración"
                >
                  ⬇ Exportar ABAP (HANA)
                </button>
                <button onClick={copyIA} className="btn ghost" style={{ fontSize: 11.5 }}>{copied ? "✓ Copiado" : "⧉ Copiar"}</button>
              </div>
            )}
          </div>

          {/* Re-análisis: readiness antes → después + toggle diff */}
          {iaMeta && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, padding: "6px 10px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)" }}>
              <span style={{ color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1, fontSize: 10 }}>Readiness HANA/CC</span>
              <b style={{ color: bandForIndex(iaMeta.beforeScore).color, fontSize: 15 }}>{iaMeta.beforeScore}</b>
              <span style={{ color: "var(--text-dim)" }}>→</span>
              <b style={{ color: bandForIndex(iaMeta.afterScore).color, fontSize: 18 }}>{iaMeta.afterScore}</b>
              {iaMeta.afterScore > iaMeta.beforeScore && <span style={{ color: "var(--ok)", fontWeight: 700 }}>▲ +{iaMeta.afterScore - iaMeta.beforeScore}</span>}
              {iaMeta.afterCloudReady && <span style={{ color: "var(--ok)", fontWeight: 600 }}>· ✓ ABAP Cloud ready</span>}
              <button onClick={() => setShowDiff((s) => !s)} className="btn ghost" style={{ fontSize: 11.5, marginLeft: "auto" }}>
                {showDiff ? "Ocultar diff" : "🔀 Ver diff"}
              </button>
            </div>
          )}
          {showDiff && iaMeta && iaResult && <DiffView rows={lineDiff(iaMeta.source, extractAbapCode(iaResult))} />}

          {iaLoading && <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}><span className="spinner" /> Generando refactor con {modelLabel(model)}… puede tardar unos segundos.</div>}
          {iaError && <div style={{ fontSize: 12.5, color: "var(--error)" }}>⚠ {iaError}</div>}
          {iaResult && <MarkdownLite text={iaResult} />}
        </div>
      )}

      {result && (
        <>
          {/* Resumen del análisis */}
          <div className="card" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ textAlign: "center", minWidth: 96 }}>
              <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: result.band.color, fontVariantNumeric: "tabular-nums" }}>{result.score}</div>
              <div style={{ fontSize: 9.5, letterSpacing: 1, color: "var(--text-dim)", textTransform: "uppercase" }}>Readiness HANA/CC</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: result.band.color, marginTop: 2 }}>{result.band.label}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip label="Hallazgos" value={result.findings.length} />
              <Chip label="Críticos" value={result.counts.critical} color={result.counts.critical ? "var(--error)" : undefined} />
              <Chip label="Altos" value={result.counts.high} color={result.counts.high ? "#ff832b" : undefined} />
              <Chip label="LOC" value={result.loc} />
              <div style={{
                padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: result.cloudReady ? "color-mix(in srgb, var(--ok) 14%, transparent)" : "color-mix(in srgb, var(--error) 12%, transparent)",
                color: result.cloudReady ? "var(--ok)" : "var(--error)",
                border: `1px solid ${result.cloudReady ? "var(--ok)" : "var(--error)"}`, display: "flex", alignItems: "center",
              }}>
                {result.cloudReady ? "✓ ABAP Cloud ready" : "✗ Bloqueos para ABAP Cloud"}
              </div>
            </div>
          </div>

          {/* Acciones: export + ticket */}
          <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => downloadText("refactor-clean-core.md", abapReportMarkdown(result), "text/markdown;charset=utf-8;")} className="btn ghost" style={{ fontSize: 12 }}>⬇ Markdown</button>
            <button onClick={() => downloadText("refactor-clean-core.csv", abapFindingsCsv(result), "text/csv;charset=utf-8;")} className="btn ghost" style={{ fontSize: 12 }}>⬇ CSV</button>
            <button onClick={createRemediationTicket} className="btn" disabled={ticket.kind === "loading" || result.findings.length === 0}
              style={{ fontSize: 12, background: "var(--accent-2, #0043ce)", color: "#fff", border: "none" }}>
              {ticket.kind === "loading" ? <><span className="spinner" /> Creando…</> : "🎫 Crear ticket de remediación"}
            </button>
            {ticket.kind === "ok" && <span style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600 }}>✓ Ticket {ticket.key} creado</span>}
            {ticket.kind === "error" && <span style={{ fontSize: 12, color: "var(--error)" }}>⚠ {ticket.msg}</span>}
          </div>

          {/* Plan de remediación */}
          {result.summary.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-dim)", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>▸ PLAN DE REMEDIACIÓN</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                {result.summary.map((s, i) => <li key={i} style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.45 }}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Hallazgos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.findings.length === 0 ? (
              <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--ok)", fontSize: 13, fontWeight: 600 }}>
                ✓ Sin anti-patrones detectados. Validá igualmente con ATC (variante cloud readiness).
              </div>
            ) : (
              result.findings.map((f, i) => <FindingCard key={`${f.ruleId}-${f.line}-${i}`} f={f} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 6, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", minWidth: 74 }}>
      <div style={{ fontSize: 9.5, letterSpacing: 0.5, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
