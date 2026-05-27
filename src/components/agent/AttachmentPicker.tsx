"use client";

import { useRef, useState } from "react";
import type { AttachmentPreview, AttachmentMime } from "@/types";

const ALLOWED_MIME: AttachmentMime[] = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILES = 4;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;   // 5 MB
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;     // 18 MB

interface Props {
  attachments: AttachmentPreview[];
  onChange: (items: AttachmentPreview[]) => void;
  disabled?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(r.error ?? new Error("read error"));
    r.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AttachmentPicker({ attachments, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const incoming: File[] = Array.from(fileList);
    const candidates: AttachmentPreview[] = [];

    if (attachments.length + incoming.length > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} imágenes por consulta.`);
      return;
    }

    let runningTotal = attachments.reduce((acc, a) => acc + a.sizeBytes, 0);

    for (const file of incoming) {
      if (!ALLOWED_MIME.includes(file.type as AttachmentMime)) {
        setError(`"${file.name}": formato no permitido. Solo PNG, JPEG y WEBP.`);
        return;
      }
      if (file.size > MAX_BYTES_PER_FILE) {
        setError(`"${file.name}" supera ${MAX_BYTES_PER_FILE / (1024 * 1024)} MB.`);
        return;
      }
      runningTotal += file.size;
      if (runningTotal > MAX_TOTAL_BYTES) {
        setError(`Los adjuntos superan ${MAX_TOTAL_BYTES / (1024 * 1024)} MB en total.`);
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        candidates.push({
          name: file.name,
          mimeType: file.type as AttachmentMime,
          sizeBytes: file.size,
          dataUrl,
        });
      } catch {
        setError(`No se pudo leer "${file.name}".`);
        return;
      }
    }

    onChange([...attachments, ...candidates]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(idx: number) {
    onChange(attachments.filter((_, i) => i !== idx));
  }

  const totalBytes = attachments.reduce((a, b) => a + b.sizeBytes, 0);

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || attachments.length >= MAX_FILES}
          style={{ display: "none" }}
          id="attach-input"
          aria-label="Adjuntar imágenes"
        />
        <label
          htmlFor="attach-input"
          className={`btn ${disabled || attachments.length >= MAX_FILES ? "" : "ghost"}`}
          style={{ cursor: disabled || attachments.length >= MAX_FILES ? "not-allowed" : "pointer", opacity: disabled || attachments.length >= MAX_FILES ? 0.55 : 1 }}
          aria-disabled={disabled || attachments.length >= MAX_FILES}
        >
          📎 Adjuntar imagen
        </label>
        <span style={{ fontSize: 12, color: "var(--text-soft)" }}>
          {attachments.length}/{MAX_FILES} · {formatSize(totalBytes)} de{" "}
          {formatSize(MAX_TOTAL_BYTES)}
        </span>
      </div>

      {error && (
        <div className="alert error" style={{ fontSize: 12.5 }}>{error}</div>
      )}

      {attachments.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 8,
          }}
        >
          {attachments.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              style={{
                position: "relative",
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.dataUrl}
                alt={a.name}
                style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 5 }}
              />
              <div style={{ fontSize: 11, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>
                {a.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{formatSize(a.sizeBytes)}</div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                aria-label={`Quitar ${a.name}`}
                style={{
                  position: "absolute",
                  top: 4, right: 4,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  width: 22, height: 22,
                  borderRadius: 11,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
