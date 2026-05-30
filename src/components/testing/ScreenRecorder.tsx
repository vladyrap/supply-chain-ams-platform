"use client";

// Grabador de pantalla. APIs nativas. SIN backend. Sin persistencia entre refresh
// salvo que el usuario descargue el video.

import { useEffect, useState } from "react";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import type { TestingScenario } from "@/types/testing";
import { humanFileSize } from "@/utils/testing-engine";

interface Props {
  testing: UseTestingIntelligence;
  actingUserId: string;
}

export default function ScreenRecorder({ testing, actingUserId }: Props) {
  const rec = useScreenRecorder();
  const [scenarioId, setScenarioId] = useState<string>(testing.scenarios[0]?.id || "");
  const [title, setTitle] = useState("Grabación de pantalla");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [attached, setAttached] = useState(false);

  // Si cambia el blob, reseteamos el attached flag
  useEffect(() => {
    setAttached(false);
  }, [rec.recordedBlob]);

  const selectedScenario: TestingScenario | undefined = testing.scenarios.find((s) => s.id === scenarioId);

  function handleAttach() {
    if (!rec.recordedBlob || !scenarioId) return;
    testing.attachEvidence(scenarioId, {
      type: "SCREEN_RECORDING",
      title: title || "Grabación de pantalla",
      description: `Grabación local sin upload. Duración: ${rec.durationSeconds}s.`,
      fileName: `screen-recording-${Date.now()}.${rec.mimeType?.includes("mp4") ? "mp4" : "webm"}`,
      fileType: rec.mimeType || "video/webm",
      fileSize: rec.recordedBlob.size,
      durationSeconds: rec.durationSeconds,
      localPreviewUrl: rec.recordedUrl || undefined,
      createdBy: actingUserId,
      tags: ["grabacion", "pantalla", selectedScenario?.sapModule || ""].filter(Boolean) as string[],
    });
    testing.markScenarioStatus(scenarioId, "RECORDED");
    setAttached(true);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {/* Advertencias */}
      <div className="card" style={{ background: "rgba(251,191,36,0.07)", borderColor: "rgba(251,191,36,0.30)", color: "#fde68a", fontSize: 12 }}>
        ⚠ <b>Esta versión graba localmente en el navegador.</b> Para persistencia real se requiere backend de almacenamiento. Si refrescás la página sin descargar, perdés el video.
        <br />
        🔒 <b>Privacidad:</b> evitá grabar datos productivos sensibles (PII, claves, datos confidenciales).
      </div>

      {!rec.isSupported && (
        <div className="card" style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", fontSize: 12 }}>
          ❌ Tu navegador no soporta <code>getDisplayMedia</code> o <code>MediaRecorder</code>. Usá Chrome / Edge / Firefox actualizados.
        </div>
      )}

      <div className="card">
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario asociado</label>
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} style={{ width: "100%" }}>
              <option value="">— elegir escenario —</option>
              {testing.scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title} · {s.sapModule}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Título de la grabación</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
          </div>
          <label className="row" style={{ gap: 6, fontSize: 12, alignSelf: "flex-end" }}>
            <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} />
            incluir audio del sistema
          </label>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          {!rec.isRecording ? (
            <button className="btn primary" disabled={!rec.isSupported || !scenarioId}
              onClick={() => rec.startRecording({ audio: includeAudio })}
              style={{ background: "linear-gradient(135deg, #ef4444, #a855f7)" }}>
              ⏺ Iniciar grabación
            </button>
          ) : (
            <button className="btn" onClick={rec.stopRecording}
              style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.5)", color: "#fca5a5" }}>
              ⏹ Detener
            </button>
          )}
          {rec.isRecording && (
            <span className="row" style={{ gap: 6, color: "#f87171", fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
              REC · {rec.durationSeconds}s
            </span>
          )}
          {!rec.isRecording && rec.recordedBlob && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              ✓ {humanFileSize(rec.recordedBlob.size)} · {rec.durationSeconds}s · {rec.mimeType}
            </span>
          )}
        </div>

        {rec.error && (
          <div className="alert error" style={{ marginTop: 10, fontSize: 12 }}>{rec.error}</div>
        )}
      </div>

      {rec.recordedUrl && (
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Previsualización
          </div>
          <video src={rec.recordedUrl} controls style={{ width: "100%", maxHeight: 420, borderRadius: 6, background: "#000" }} />
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => rec.downloadRecording(`testing-${scenarioId || "demo"}`)}>
              ⬇ Descargar video
            </button>
            <button className="btn primary" onClick={handleAttach} disabled={!scenarioId || attached}>
              {attached ? "✓ Adjuntado al escenario" : "📎 Adjuntar como evidencia"}
            </button>
            <button className="btn ghost" onClick={rec.resetRecording} style={{ marginLeft: "auto" }}>
              ↻ Descartar grabación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
