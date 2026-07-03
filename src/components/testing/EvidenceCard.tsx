"use client";

import type { EvidenceItem } from "@/types/testing";
import { EVIDENCE_TYPE_LABELS } from "@/types/testing";
import { humanFileSize } from "@/utils/testing-engine";

const TYPE_ICONS: Record<EvidenceItem["type"], string> = {
  SCREEN_RECORDING: "🎥",
  UPLOADED_VIDEO:   "📼",
  SCREENSHOT:       "🖼",
  NOTE:             "📝",
  FILE:             "📎",
  LINK:             "🔗",
  LOG:              "📜",
};

interface Props {
  evidence: EvidenceItem;
  scenarioTitle?: string;
  onRemove?: () => void;
  onRename?: () => void;
}

export default function EvidenceCard({ evidence: e, scenarioTitle, onRemove, onRename }: Props) {
  const isVideo = e.type === "SCREEN_RECORDING" || e.type === "UPLOADED_VIDEO";
  const sessionGone = isVideo && !e.localPreviewUrl;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            <span style={{ marginRight: 6 }}>{TYPE_ICONS[e.type]}</span>
            {e.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>
            {EVIDENCE_TYPE_LABELS[e.type]}
            {scenarioTitle && <> · {scenarioTitle}</>}
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
          {new Date(e.createdAt).toLocaleDateString()}
        </span>
      </div>

      {isVideo && e.localPreviewUrl && (
        <video src={e.localPreviewUrl} controls style={{ width: "100%", maxHeight: 200, borderRadius: 4, background: "#000" }} />
      )}
      {isVideo && sessionGone && (
        <div style={{ fontSize: 11, color: "#fcd34d", padding: 8, background: "rgba(241,194,27,0.07)", borderRadius: 4 }}>
          ⚠ Preview no disponible (video no persistido tras refresh). Volvé a cargar el archivo o consultá el log de la evidencia.
        </div>
      )}
      {(e.type === "NOTE" || e.type === "LOG") && e.noteText && (
        <pre style={{
          margin: 0, padding: 8, background: "rgba(0,0,0,0.25)", borderRadius: 4,
          fontSize: 11.5, fontFamily: "var(--font-mono, monospace)",
          whiteSpace: "pre-wrap", maxHeight: 160, overflowY: "auto", color: "#cbd5e1",
        }}>{e.noteText}</pre>
      )}
      {e.type === "LINK" && e.externalUrl && (
        <a href={e.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#7dd3fc", wordBreak: "break-all" }}>
          ↗ {e.externalUrl}
        </a>
      )}

      <div style={{ fontSize: 10.5, color: "var(--text-soft)" }}>
        {e.fileName && <>📄 {e.fileName}</>}
        {e.fileSize ? <> · {humanFileSize(e.fileSize)}</> : null}
        {e.durationSeconds ? <> · {e.durationSeconds}s</> : null}
        {e.tags && e.tags.length > 0 && <> · 🏷 {e.tags.slice(0, 3).join(", ")}</>}
      </div>

      {(onRename || onRemove) && (
        <div className="row" style={{ gap: 6, marginTop: "auto" }}>
          {onRename && (
            <button className="btn ghost" onClick={onRename} style={{ padding: "2px 8px", fontSize: 11 }}>renombrar</button>
          )}
          {onRemove && (
            <button className="btn ghost" onClick={onRemove}
              style={{ padding: "2px 8px", fontSize: 11, marginLeft: "auto", color: "#fca5a5", borderColor: "rgba(250,77,86,0.4)" }}>
              eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
