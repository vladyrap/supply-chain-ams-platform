"use client";

// Panel completo de estimación para el detalle del ticket/incidente:
// resumen + timeline + fases con tabla + supuestos/riesgos/dependencias/
// missing + botones recalcular/ajustar/exportar.

import { useState } from "react";
import type {
  TicketEstimatedResolution, ConfidenceLevel, ComplexityLevel,
} from "@/types/estimation";
import { PROFILE_LABELS } from "@/types/estimation";
import TicketEstimateSummary from "./TicketEstimateSummary";
import TicketEstimateTimeline from "./TicketEstimateTimeline";
import RecalculateEstimateButton from "./RecalculateEstimateButton";
import ManualEstimateAdjustmentModal from "./ManualEstimateAdjustmentModal";

interface Props {
  estimate?: TicketEstimatedResolution | null;
  /** Llamado al pedir recálculo. Si no se pasa, se oculta el botón. */
  onRecalculate?: () => Promise<void> | void;
  /** Llamado al guardar un ajuste manual. Si no se pasa, se oculta el botón. */
  onManualAdjust?: (patch: {
    totalMinHours: number;
    totalMaxHours: number;
    confidence: ConfidenceLevel;
    complexity: ComplexityLevel;
  }, reason: string) => Promise<void> | void;
  /** Llamado al pedir export markdown. Si no se pasa, se oculta el botón. */
  onExport?: () => void;
  /** Nombre del usuario actual para auditoría del ajuste manual */
  actor?: string;
  /** Permisos para mostrar/ocultar acciones (default todo true) */
  canRecalculate?: boolean;
  canAdjustManual?: boolean;
}

function colorBy(c: "info" | "ok" | "warn" | "err"): string {
  if (c === "ok") return "#10b981";
  if (c === "warn") return "#fbbf24";
  if (c === "err") return "#ef4444";
  return "#22d3ee";
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: "info" | "ok" | "warn" | "err" }) {
  if (items.length === 0) return null;
  const c = colorBy(tone);
  return (
    <div className="lab-fb-block" style={{ borderLeft: `3px solid ${c}` }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: c, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--text-soft)", lineHeight: 1.55 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

export default function TicketEstimateDetail({
  estimate, onRecalculate, onManualAdjust, onExport,
  actor = "Usuario AMS", canRecalculate = true, canAdjustManual = true,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!estimate) {
    return (
      <div className="card">
        <div className="ticket-section-head">⏱ ESTIMACIÓN DE RESOLUCIÓN</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Sin estimación. {onRecalculate && "Click Recalcular para generar una ahora."}
        </div>
        {onRecalculate && canRecalculate && (
          <div style={{ marginTop: 8 }}>
            <RecalculateEstimateButton onRecalculate={onRecalculate} label="⚡ Generar estimación" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="ticket-section-head" style={{ marginBottom: 0 }}>⏱ ESTIMACIÓN DE RESOLUCIÓN</div>
        <div className="row" style={{ gap: 6 }}>
          {onRecalculate && canRecalculate && <RecalculateEstimateButton onRecalculate={onRecalculate} />}
          {onManualAdjust && canAdjustManual && (
            <button className="btn ghost" onClick={() => setModalOpen(true)} style={{ padding: "4px 10px", fontSize: 11 }}>
              ✎ Ajustar manualmente
            </button>
          )}
          {onExport && (
            <button className="btn ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 11 }}>
              ↓ Exportar
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <TicketEstimateSummary estimate={estimate} title="Esfuerzo estimado total" />
      </div>

      <div style={{ marginTop: 12 }}>
        <TicketEstimateTimeline estimate={estimate} />
      </div>

      {/* Tabla de fases */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", letterSpacing: 2, marginBottom: 6 }}>
          DESGLOSE POR FASES
        </div>
        <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
              <th style={{ padding: "4px 6px", fontWeight: 600, width: 30 }}>#</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Fase</th>
              <th style={{ padding: "4px 6px", fontWeight: 600, width: 90, textAlign: "right" }}>Horas</th>
              <th style={{ padding: "4px 6px", fontWeight: 600, width: 170 }}>Owner</th>
            </tr>
          </thead>
          <tbody>
            {estimate.phaseBreakdown.map((p, i) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "4px 6px", color: "var(--text-dim)" }}>{i + 1}</td>
                <td style={{ padding: "4px 6px" }}>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{p.description}</div>
                </td>
                <td style={{ padding: "4px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {p.minHours}–{p.maxHours}
                </td>
                <td style={{ padding: "4px 6px", fontSize: 11, color: "var(--text-soft)" }}>
                  {PROFILE_LABELS[p.ownerProfile] ?? p.ownerProfile}
                  {!p.required && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--text-dim)" }}>(opcional)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Listas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <Section title="✅ Supuestos" items={estimate.assumptions} tone="ok" />
        <Section title="⚠ Riesgos" items={estimate.risks} tone="warn" />
        <Section title="🔗 Dependencias" items={estimate.dependencies} tone="info" />
        <Section title="❓ Datos faltantes" items={estimate.missingData} tone="err" />
      </div>

      {estimate.adjustmentReason && (
        <div className="alert ok" style={{ marginTop: 10, fontSize: 11.5 }}>
          <strong>Ajuste manual:</strong> {estimate.adjustmentReason}
          {estimate.adjustedBy && <> · por <em>{estimate.adjustedBy}</em></>}
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 10 }}>
        Generado por {estimate.generatedBy} · {new Date(estimate.generatedAt).toLocaleString("es-CL")}
        {estimate.lastRecalculatedAt !== estimate.generatedAt && (
          <> · recalculado {new Date(estimate.lastRecalculatedAt).toLocaleString("es-CL")}</>
        )}
      </div>

      {onManualAdjust && (
        <ManualEstimateAdjustmentModal
          open={modalOpen}
          estimate={estimate}
          actor={actor}
          onClose={() => setModalOpen(false)}
          onSave={async (patch, reason) => {
            await onManualAdjust(patch, reason);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
