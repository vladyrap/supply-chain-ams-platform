"use client";

import { useState } from "react";
import type { CurationCandidate } from "@/types/knowledge-curation";

interface Props {
  candidate: CurationCandidate;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onPublish?: () => void;
}

export default function KnowledgeCurationCard({ candidate, onApprove, onReject, onPublish }: Props) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const scoreColor = candidate.brilliantScore >= 85 ? "#10b981"
    : candidate.brilliantScore >= 70 ? "#4589ff"
    : "#f59e0b";

  return (
    <div className="card" style={{ padding: 12, borderLeft: `3px solid ${scoreColor}` }}>
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-dim)" }}>
            🧠 KB CANDIDATO · {candidate.ticketKey}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {candidate.proposedKbTitle}
          </div>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 4, textAlign: "center",
          background: `${scoreColor}22`, border: `1px solid ${scoreColor}55`,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor, fontVariantNumeric: "tabular-nums" }}>
            {candidate.brilliantScore}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: 1.5 }}>BRILLIANT</div>
        </div>
      </div>

      <div className="row" style={{ gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {candidate.sapModule && <span className="badge info" style={{ fontSize: 10 }}>{candidate.sapModule}</span>}
        {candidate.proposedTags.slice(0, 5).map((t) => (
          <span key={t} className="badge muted" style={{ fontSize: 10 }}>{t}</span>
        ))}
      </div>

      <details style={{ marginBottom: 8 }}>
        <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
          📚 Score breakdown ({candidate.scoreFactors.length} factores)
        </summary>
        <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 11.5, color: "var(--text-soft)" }}>
          {candidate.scoreFactors.map((f, i) => (
            <li key={i}><strong>+{f.weight}</strong> {f.factor} — {f.reason}</li>
          ))}
        </ul>
      </details>

      <details style={{ marginBottom: 8 }}>
        <summary style={{ fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
          📄 Preview KB
        </summary>
        <div style={{
          marginTop: 6, padding: 8, borderRadius: 4,
          background: "var(--bg-elev)", fontSize: 11.5, color: "var(--text-soft)",
        }}>
          <div><strong>Problema:</strong> {candidate.problemSummary.slice(0, 200)}…</div>
          <div style={{ marginTop: 4 }}><strong>Causa raíz:</strong> {candidate.rootCauseSummary}</div>
          <div style={{ marginTop: 4 }}><strong>Solución:</strong> {candidate.solutionSummary}</div>
          {candidate.validationSummary && <div style={{ marginTop: 4 }}><strong>Validación:</strong> {candidate.validationSummary}</div>}
          {candidate.preventionRecommendation && <div style={{ marginTop: 4 }}><strong>Prevención:</strong> {candidate.preventionRecommendation}</div>}
        </div>
      </details>

      {/* Acciones */}
      {candidate.status === "PROPOSED" && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {onApprove && (
            <button className="btn primary sm" onClick={onApprove}
              style={{ fontSize: 11, background: "#10b981", borderColor: "#10b981" }}>
              ✓ Aprobar
            </button>
          )}
          {onPublish && (
            <button className="btn ghost sm" onClick={onPublish}
              style={{ fontSize: 11 }}>
              📚 Publicar como KB
            </button>
          )}
          {onReject && !showRejectForm && (
            <button className="btn ghost sm" onClick={() => setShowRejectForm(true)}
              style={{ fontSize: 11, color: "#fa4d56" }}>
              ✕ Rechazar
            </button>
          )}
        </div>
      )}

      {candidate.status === "APPROVED" && (
        <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>
          ✓ Aprobada · {candidate.reviewedBy ?? "—"}
        </div>
      )}

      {candidate.status === "REJECTED" && (
        <div style={{ fontSize: 11, color: "#fa4d56" }}>
          ✕ Rechazada: {candidate.rejectionReason ?? "sin razón"}
        </div>
      )}

      {showRejectForm && (
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          <textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Razón del rechazo..."
            style={{ fontSize: 12 }}
          />
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn primary sm"
              onClick={() => {
                if (rejectReason.trim().length >= 5 && onReject) {
                  onReject(rejectReason.trim());
                  setShowRejectForm(false);
                }
              }}
              style={{ fontSize: 11, background: "#fa4d56", borderColor: "#fa4d56" }}
              disabled={rejectReason.trim().length < 5}
            >
              Confirmar rechazo
            </button>
            <button className="btn ghost sm" onClick={() => setShowRejectForm(false)} style={{ fontSize: 11 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
