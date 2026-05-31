"use client";

// Modal para ajustar manualmente una estimación: horas min/max, confianza,
// complejidad + razón obligatoria. Marca manuallyAdjusted=true al guardar.

import { useState } from "react";
import type {
  TicketEstimatedResolution, ConfidenceLevel, ComplexityLevel,
} from "@/types/estimation";
import { COMPLEXITY_LEVELS, COMPLEXITY_LABELS, CONFIDENCE_LABELS } from "@/types/estimation";

interface Props {
  open: boolean;
  estimate: TicketEstimatedResolution;
  actor: string;
  onClose: () => void;
  onSave: (patch: {
    totalMinHours: number;
    totalMaxHours: number;
    confidence: ConfidenceLevel;
    complexity: ComplexityLevel;
  }, reason: string) => void;
}

export default function ManualEstimateAdjustmentModal({
  open, estimate, actor, onClose, onSave,
}: Props) {
  const [minH, setMinH] = useState(estimate.totalMinHours);
  const [maxH, setMaxH] = useState(estimate.totalMaxHours);
  const [conf, setConf] = useState<ConfidenceLevel>(estimate.confidence);
  const [complex, setComplex] = useState<ComplexityLevel>(estimate.complexity);
  const [reason, setReason] = useState("");

  if (!open) return null;

  function save() {
    if (!reason.trim()) { alert("La razón es obligatoria para auditoría."); return; }
    if (maxH < minH) { alert("Las horas máximas no pueden ser menores que las mínimas."); return; }
    onSave({ totalMinHours: minH, totalMaxHours: maxH, confidence: conf, complexity: complex }, reason.trim());
  }

  return (
    <div role="dialog" style={{
      position: "fixed", inset: 0, background: "rgba(2,6,23,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 520, width: "100%", padding: 18 }}>
        <div className="ticket-section-head">✎ AJUSTE MANUAL DE ESTIMACIÓN</div>
        <p className="settings-section-desc">
          Cambios marcarán esta estimación como ajustada manualmente. Recalcular automáticamente
          no la pisará a menos que un admin fuerce.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="tc-field">
            <span>Horas mínimas</span>
            <input type="number" step="0.5" min={0.1} value={minH}
              onChange={(e) => setMinH(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="tc-field">
            <span>Horas máximas</span>
            <input type="number" step="0.5" min={0.1} value={maxH}
              onChange={(e) => setMaxH(parseFloat(e.target.value) || 0)} />
          </label>
          <label className="tc-field">
            <span>Confianza</span>
            <select value={conf} onChange={(e) => setConf(e.target.value as ConfidenceLevel)}>
              {(["LOW", "MEDIUM", "HIGH"] as ConfidenceLevel[]).map((x) => (
                <option key={x} value={x}>{CONFIDENCE_LABELS[x]}</option>
              ))}
            </select>
          </label>
          <label className="tc-field">
            <span>Complejidad</span>
            <select value={complex} onChange={(e) => setComplex(e.target.value as ComplexityLevel)}>
              {COMPLEXITY_LEVELS.map((x) => (
                <option key={x} value={x}>{COMPLEXITY_LABELS[x]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="tc-field" style={{ marginTop: 10 }}>
          <span>Razón del ajuste *</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Por qué se cambia (ej. cliente confirmó que sí hay desarrollo, complejidad mayor a lo inicialmente estimado)" />
        </label>

        <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6 }}>
          Auditoría: ajuste lo hará <strong>{actor}</strong>.
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>cancelar</button>
          <button className="btn primary" onClick={save}>guardar ajuste</button>
        </div>
      </div>
    </div>
  );
}
