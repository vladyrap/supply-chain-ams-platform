"use client";

import { useState } from "react";
import type { UseAgentTraining } from "@/hooks/useAgentTraining";
import type { TrainingVersion } from "@/types/training";
import { VERSION_STATUS_COLORS, VERSION_STATUS_LABELS } from "@/types/training";

interface Props { ctx: UseAgentTraining; currentUserName?: string }

export default function TrainingVersions({ ctx, currentUserName = "Líder Servicio" }: Props) {
  const [desc, setDesc] = useState("");
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [confirmPublish, setConfirmPublish] = useState<TrainingVersion | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<TrainingVersion | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function create() {
    if (!desc.trim()) { showToast("Indicá una descripción para la versión."); return; }
    const v = ctx.createVersion(desc, currentUserName);
    setDesc("");
    showToast(`Versión ${v.version} creada en estado borrador.`);
  }

  function exportChangelog(v: TrainingVersion) {
    const md = `# Changelog ${v.version}\n\n${v.description}\n\n${v.changelog.map((c) => `- ${c}`).join("\n")}\n\n— ${v.createdBy} · ${new Date(v.createdAt).toISOString()}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `changelog-${v.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const versions = [...ctx.versions].sort((a, b) => (b.createdAt).localeCompare(a.createdAt));
  const verA = versions.find((v) => v.id === compareA);
  const verB = versions.find((v) => v.id === compareB);

  return (
    <div className="col" style={{ gap: 14 }}>
      {toast && <div className="alert ok">{toast}</div>}

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🏷</span> NUEVA VERSIÓN DEL AGENTE
        </div>
        <p className="settings-section-desc">
          Una versión es un snapshot del conocimiento activo. Al publicarla, las versiones anteriores pasan a archivadas.
        </p>
        <div className="row" style={{ gap: 8 }}>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción del cambio principal..." style={{ flex: 1 }} />
          <button className="btn primary" onClick={create} disabled={!desc.trim()}>+ crear versión</button>
        </div>
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>📜</span> HISTORIAL · {versions.length}
        </div>
        <div className="col" style={{ gap: 10 }}>
          {versions.map((v) => (
            <div key={v.id} className="lab-fb-card" style={{ ["--fb-color" as never]: VERSION_STATUS_COLORS[v.status] }}>
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: VERSION_STATUS_COLORS[v.status] }}>{v.version}</span>
                <span className="tc-pill" style={{ background: `${VERSION_STATUS_COLORS[v.status]}20`, border: `1px solid ${VERSION_STATUS_COLORS[v.status]}66`, color: VERSION_STATUS_COLORS[v.status] }}>
                  {VERSION_STATUS_LABELS[v.status]}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  por <b>{v.createdBy}</b> · {new Date(v.createdAt).toLocaleString("es-CL")}
                </span>
                {v.publishedAt && <span style={{ fontSize: 11, color: "#10b981" }}>🚀 publicada {new Date(v.publishedAt).toLocaleDateString("es-CL")}</span>}
              </div>
              <div style={{ fontSize: 13.5, marginBottom: 6 }}>{v.description}</div>

              <div className="row" style={{ gap: 10, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-soft)", marginBottom: 8 }}>
                <span>📚 <b>{v.itemCount}</b> ítems</span>
                <span>✓ <b>{v.validatedCount}</b> validados</span>
                <span>🚀 <b>{v.publishedCount}</b> publicados</span>
              </div>

              {v.changelog.length > 0 && (
                <details>
                  <summary style={{ fontSize: 11, cursor: "pointer", color: "var(--text-dim)" }}>changelog ({v.changelog.length})</summary>
                  <ul style={{ fontSize: 12, color: "var(--text-soft)", paddingLeft: 18, marginTop: 6 }}>
                    {v.changelog.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </details>
              )}

              <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {v.status === "DRAFT" || v.status === "READY" ? (
                  <button className="btn primary" onClick={() => setConfirmPublish(v)}>🚀 publicar versión</button>
                ) : null}
                {v.status === "PUBLISHED" && (
                  <button className="btn ghost" onClick={() => setConfirmRollback(v)} style={{ borderColor: "#b45309", color: "#8a6d00" }}>
                    ↩ rollback simulado
                  </button>
                )}
                <button className="btn ghost" onClick={() => exportChangelog(v)}>↓ exportar changelog</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="ticket-section-head">
          <span style={{ color: "var(--accent)" }}>🔍</span> COMPARAR VERSIONES
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={compareA} onChange={(e) => setCompareA(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">A: seleccionar versión</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.version} — {v.description.slice(0, 50)}</option>)}
          </select>
          <span style={{ color: "var(--text-dim)" }}>↔</span>
          <select value={compareB} onChange={(e) => setCompareB(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">B: seleccionar versión</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.version} — {v.description.slice(0, 50)}</option>)}
          </select>
        </div>

        {verA && verB && (
          <div className="tc-compare-grid">
            <div className="tc-compare-col">
              <h4>{verA.version}</h4>
              <div>ítems: <b>{verA.itemCount}</b></div>
              <div>validados: <b>{verA.validatedCount}</b></div>
              <div>publicados: <b>{verA.publishedCount}</b></div>
              <div>estado: <b style={{ color: VERSION_STATUS_COLORS[verA.status] }}>{VERSION_STATUS_LABELS[verA.status]}</b></div>
            </div>
            <div className="tc-compare-col">
              <h4>{verB.version}</h4>
              <div>ítems: <b>{verB.itemCount}</b> <Delta a={verA.itemCount} b={verB.itemCount} /></div>
              <div>validados: <b>{verB.validatedCount}</b> <Delta a={verA.validatedCount} b={verB.validatedCount} /></div>
              <div>publicados: <b>{verB.publishedCount}</b> <Delta a={verA.publishedCount} b={verB.publishedCount} /></div>
              <div>estado: <b style={{ color: VERSION_STATUS_COLORS[verB.status] }}>{VERSION_STATUS_LABELS[verB.status]}</b></div>
            </div>
          </div>
        )}
      </div>

      {confirmPublish && (
        <ConfirmDialog
          title={`Publicar ${confirmPublish.version}`}
          message={`Vas a publicar ${confirmPublish.version}. Las versiones publicadas anteriores pasarán a estado "archivadas".`}
          confirmLabel="🚀 publicar"
          color="#10b981"
          onCancel={() => setConfirmPublish(null)}
          onConfirm={() => {
            ctx.publishVersion(confirmPublish.id);
            showToast(`${confirmPublish.version} publicada.`);
            setConfirmPublish(null);
          }}
        />
      )}

      {confirmRollback && (
        <ConfirmDialog
          title={`Rollback de ${confirmRollback.version}`}
          message={`Vas a marcar ${confirmRollback.version} como rolled-back. Esta acción es simulada y no afecta el conocimiento activo.`}
          confirmLabel="↩ confirmar rollback"
          color="#f59e0b"
          onCancel={() => setConfirmRollback(null)}
          onConfirm={() => {
            ctx.rollbackVersion(confirmRollback.id);
            showToast(`${confirmRollback.version} marcada como rolled-back.`);
            setConfirmRollback(null);
          }}
        />
      )}
    </div>
  );
}

function Delta({ a, b }: { a: number; b: number }) {
  const d = b - a;
  if (d === 0) return null;
  const color = d > 0 ? "#10b981" : "#fa4d56";
  return <span style={{ color, fontSize: 11 }}>({d > 0 ? "+" : ""}{d})</span>;
}

function ConfirmDialog({ title, message, confirmLabel, color, onCancel, onConfirm }: {
  title: string; message: string; confirmLabel: string; color: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="tc-modal-back" onClick={onCancel}>
      <div className="tc-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="tc-modal-head">
          <h2 style={{ margin: 0, fontSize: 16, color }}>{title}</h2>
          <button onClick={onCancel} className="btn ghost" style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div className="tc-modal-body">
          <p style={{ fontSize: 13.5, color: "var(--text-soft)", lineHeight: 1.55 }}>{message}</p>
        </div>
        <div className="tc-modal-foot">
          <button className="btn ghost" onClick={onCancel}>cancelar</button>
          <button className="btn primary" onClick={onConfirm} style={{ background: color, borderColor: color, marginLeft: "auto" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
