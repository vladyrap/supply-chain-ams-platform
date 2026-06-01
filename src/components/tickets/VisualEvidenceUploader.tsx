"use client";

// Uploader de evidencia visual para el modal Nuevo Ticket.
// - Acepta png/jpg/jpeg/webp.
// - Cap a 4 imágenes y 4MB por imagen.
// - Genera ObjectURL para preview (se revoca al limpiar).
// - El análisis demo es síncrono client-side; cuando exista backend visión IA
//   se reemplaza por llamada async sin tocar este componente.
// - NUNCA persiste File ni base64 en localStorage.

import { useEffect, useRef, useState } from "react";
import type {
  TemporaryVisualEvidence, VisualErrorAnalysis,
} from "@/types/visual-evidence";
import {
  analyzeVisualEvidenceDemo, buildManualVisualAnalysis,
} from "@/utils/visual-error-analysis-engine";
import VisualAnalysisResultCard from "./VisualAnalysisResultCard";

const MAX_FILES = 4;
const MAX_SIZE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

interface Props {
  evidence: TemporaryVisualEvidence[];
  onChange: (next: TemporaryVisualEvidence[]) => void;
  /** Texto del ticket para alimentar la heurística del engine demo. */
  ticketTitle: string;
  ticketDescription: string;
}

const uid = () => `ev_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

export default function VisualEvidenceUploader({ evidence, onChange, ticketTitle, ticketDescription }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revocar previewUrls al desmontar
  useEffect(() => {
    return () => {
      for (const e of evidence) {
        if (e.previewUrl) URL.revokeObjectURL(e.previewUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickFiles() {
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    setError(null);
    if (!files) return;
    const next = [...evidence];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_FILES) {
        setError(`Máximo ${MAX_FILES} imágenes por ticket.`);
        break;
      }
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`Tipo no soportado: ${f.type}. Solo PNG, JPG, WEBP.`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        setError(`"${f.name}" supera 4 MB.`);
        continue;
      }
      next.push({
        id: uid(),
        file: f,
        fileName: f.name,
        fileType: f.type,
        fileSize: f.size,
        mediaType: "IMAGE",
        previewUrl: URL.createObjectURL(f),
        uploadedAt: new Date().toISOString(),
        userComment: "",
        analysisStatus: "PENDING",
        consideredForEstimate: true,
      });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateOne(id: string, patch: Partial<TemporaryVisualEvidence>) {
    onChange(evidence.map((e) => e.id === id ? { ...e, ...patch } : e));
  }

  function removeOne(id: string) {
    const v = evidence.find((e) => e.id === id);
    if (v?.previewUrl) URL.revokeObjectURL(v.previewUrl);
    onChange(evidence.filter((e) => e.id !== id));
  }

  async function analyzeOne(ev: TemporaryVisualEvidence) {
    updateOne(ev.id, { analysisStatus: "ANALYZING" });
    // Pequeño defer para que se vea el "analizando..." aunque el engine sea sync
    await new Promise((r) => setTimeout(r, 400));
    try {
      const a = analyzeVisualEvidenceDemo({
        fileName: ev.fileName,
        userComment: ev.userComment,
        ticketTitle, ticketDescription,
      });
      updateOne(ev.id, { analysisStatus: "ANALYZED", visualAnalysis: a, consideredForEstimate: true });
    } catch {
      updateOne(ev.id, { analysisStatus: "FAILED" });
    }
  }

  function useManualSummary(ev: TemporaryVisualEvidence) {
    if (!ev.userComment.trim()) {
      setError("Escribe un resumen manual antes de marcarlo como análisis.");
      return;
    }
    const a: VisualErrorAnalysis = buildManualVisualAnalysis({
      fileName: ev.fileName, userComment: ev.userComment,
    });
    updateOne(ev.id, { analysisStatus: "MANUAL_ONLY", visualAnalysis: a, consideredForEstimate: true });
  }

  return (
    <div>
      <div className="ticket-section-head">📷 EVIDENCIA VISUAL DEL ERROR</div>
      <p className="settings-section-desc">
        Adjuntá una captura del error SAP. El agente intentará leer el mensaje visible y usarlo
        junto con la descripción para estimar el tiempo de resolución.
      </p>
      <div className="alert info" style={{ fontSize: 11, padding: "6px 10px" }}>
        🔒 <strong>Imágenes temporales:</strong> el archivo NO se guardará. Solo se conservará
        el resumen textual del análisis si creás el ticket.
        <br />
        ⚠ No adjuntes información productiva sensible si no está autorizada.
      </div>

      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn ghost" onClick={pickFiles}
          disabled={evidence.length >= MAX_FILES}>
          📎 Adjuntar imagen ({evidence.length}/{MAX_FILES})
        </button>
        <input ref={inputRef} type="file" hidden multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {error && <div className="alert error" style={{ marginTop: 6, fontSize: 11.5 }}>{error}</div>}

      {evidence.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-dim)", textAlign: "center", padding: 14 }}>
          Sin imágenes adjuntas todavía. El ticket se puede crear igual sin imagen.
        </div>
      ) : (
        <div className="col" style={{ gap: 10, marginTop: 10 }}>
          {evidence.map((ev) => (
            <div key={ev.id} className="card" style={{ padding: 10, borderLeft: "3px solid #22d3ee" }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                {/* Preview */}
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ev.previewUrl} alt={ev.fileName} style={{
                    width: 140, height: 100, objectFit: "cover",
                    border: "1px solid var(--border-soft)", borderRadius: 4,
                  }} />
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                       title={ev.fileName}>
                    {ev.fileName}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                    {(ev.fileSize / 1024).toFixed(0)} KB · {ev.fileType.split("/")[1]}
                  </div>
                </div>

                {/* Comentario + acciones */}
                <div className="col" style={{ gap: 6 }}>
                  <label className="tc-field" style={{ margin: 0 }}>
                    <span style={{ fontSize: 11 }}>Comentario sobre esta imagen (opcional)</span>
                    <textarea rows={2} value={ev.userComment}
                      onChange={(e) => updateOne(ev.id, { userComment: e.target.value })}
                      placeholder="Ej: error al hacer MIGO contra OC 4500001234, material XYZ centro 1100" />
                  </label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="btn primary"
                      onClick={() => analyzeOne(ev)}
                      disabled={ev.analysisStatus === "ANALYZING"}
                      style={{ padding: "4px 10px", fontSize: 11.5 }}>
                      {ev.analysisStatus === "ANALYZING"
                        ? <><span className="spinner" /> analizando…</>
                        : "🤖 Analizar imagen con IA"}
                    </button>
                    <button type="button" className="btn ghost"
                      onClick={() => useManualSummary(ev)}
                      style={{ padding: "4px 10px", fontSize: 11.5 }}>
                      ✎ Usar comentario como resumen
                    </button>
                    <button type="button" className="btn ghost"
                      onClick={() => removeOne(ev.id)}
                      style={{ padding: "4px 10px", fontSize: 11.5, color: "#ef4444", marginLeft: "auto" }}>
                      🗑 Quitar
                    </button>
                  </div>
                </div>
              </div>

              {ev.visualAnalysis && (
                <VisualAnalysisResultCard
                  analysis={ev.visualAnalysis}
                  consideredForEstimate={ev.consideredForEstimate}
                  onToggleConsider={(next) => updateOne(ev.id, { consideredForEstimate: next })}
                />
              )}
              {ev.analysisStatus === "FAILED" && (
                <div className="alert error" style={{ marginTop: 6, fontSize: 11.5 }}>
                  El análisis falló. Podés usar el comentario manual con &quot;✎ Usar comentario como resumen&quot;.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
