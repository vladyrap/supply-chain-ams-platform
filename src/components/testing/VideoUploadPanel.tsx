"use client";

// Carga local de video. No sube al backend. Crea ObjectURL en memoria.

import { useRef, useState } from "react";
import type { UseTestingIntelligence } from "@/hooks/useTestingIntelligence";
import { humanFileSize } from "@/utils/testing-engine";

interface Props {
  testing: UseTestingIntelligence;
  actingUserId: string;
}

const ACCEPTED = "video/mp4,video/webm,video/quicktime,video/x-msvideo";

export default function VideoUploadPanel({ testing, actingUserId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [scenarioId, setScenarioId] = useState<string>(testing.scenarios[0]?.id || "");
  const [title, setTitle] = useState("");
  const [attached, setAttached] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
    }
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setTitle(f.name);
    setDurationSeconds(null);
    setAttached(false);
  }

  function onLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (Number.isFinite(v.duration)) {
      setDurationSeconds(Math.round(v.duration));
    }
  }

  async function handleAttach() {
    if (!file || !scenarioId) return;
    await testing.uploadEvidenceFile(scenarioId, file, {
      type: "UPLOADED_VIDEO",
      title: title || file.name,
      description: `Video cargado · ${durationSeconds ? durationSeconds + "s." : ""}`,
      durationSeconds: durationSeconds ?? undefined,
      tags: ["video", "carga"],
      createdBy: actingUserId,
      filename: file.name,
    });
    setAttached(true);
  }

  function handleClear() {
    if (previewUrl) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
    }
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    setDurationSeconds(null);
    setAttached(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card" style={{ background: "rgba(241,194,27,0.07)", borderColor: "rgba(241,194,27,0.30)", color: "#8a6d00", fontSize: 12 }}>
        ⚠ El video <b>no se sube al backend</b> en esta versión. Sólo se guarda metadata localmente. Si refrescás sin descargar, el preview deja de funcionar.
      </div>

      <div className="card">
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input ref={inputRef} type="file" accept={ACCEPTED} onChange={onPick} />
          {file && (
            <span style={{ fontSize: 11.5, color: "var(--text-soft)" }}>
              {file.name} · {humanFileSize(file.size)} · {file.type || "tipo desconocido"}
              {durationSeconds !== null && <> · {durationSeconds}s</>}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Escenario asociado</label>
            <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} style={{ width: "100%" }}>
              <option value="">— elegir —</option>
              {testing.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.sapModule}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)" }}>Título de la evidencia</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Preview
          </div>
          <video src={previewUrl} controls onLoadedMetadata={onLoadedMetadata}
            style={{ width: "100%", maxHeight: 420, borderRadius: 6, background: "#000" }} />
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn primary" onClick={handleAttach} disabled={!scenarioId || attached}>
              {attached ? "✓ Adjuntado" : "📎 Adjuntar como evidencia"}
            </button>
            <button className="btn ghost" onClick={handleClear} style={{ marginLeft: "auto" }}>
              ↻ Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
