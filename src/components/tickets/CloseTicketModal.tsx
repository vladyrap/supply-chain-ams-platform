"use client";

import { useMemo, useState } from "react";
import TcModalShell from "@/components/ui/TcModalShell";
import type { Ticket } from "@/services/tickets.api";
import type { TicketEstimatedResolution } from "@/types/estimation";

interface Props {
  ticket: Ticket;
  closingUser: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (input: { actualHours: number; closeNote?: string }) => Promise<void> | void;
}

/**
 * Modal de cierre de ticket. Pide al consultor las horas reales que tomó
 * resolver y muestra inmediatamente la desviación contra la estimación.
 *
 * Es el INPUT principal del trackeo "estimado vs real" — alimenta el tile del
 * dashboard y la re-calibración del motor. Sin estas horas, el sistema no
 * puede aprender.
 *
 * Diseño honesto: muestra qué tan off estuvo la estimación, no lo esconde.
 * El consultor ve "el motor te estimó 12-20h, hiciste 28h — desviación +47%".
 */
export default function CloseTicketModal({
  ticket, closingUser, busy, error, onClose, onConfirm,
}: Props) {
  const est = ticket.estimatedResolution ?? null;
  const [hoursStr, setHoursStr] = useState<string>(() => {
    if (!est) return "";
    const mid = (est.totalMinHours + est.totalMaxHours) / 2;
    return mid.toFixed(1);
  });
  const [note, setNote] = useState("");
  const hours = useMemo(() => {
    const n = Number(hoursStr.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [hoursStr]);

  const preview = useMemo(() => previewVariance(est, hours), [est, hours]);
  const needsNote = preview && Math.abs(preview.variancePct) >= 50;
  const canSubmit = hours > 0 && !busy && (!needsNote || note.trim().length >= 10);

  return (
    <TcModalShell onClose={busy ? () => {} : onClose}>
      <div
        className="tc-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580, width: "92vw" }}
      >
        <div className="tc-modal-header">
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "var(--text-dim)" }}>
              CIERRE · {ticket.key}
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 18 }}>Registrar horas reales</h3>
          </div>
          {!busy && (
            <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
          )}
        </div>

        <div className="tc-modal-body" style={{ display: "grid", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55 }}>
            Para cerrar el ticket necesitamos las horas que efectivamente tomó la
            resolución. El sistema compara contra la estimación y usa la
            desviación para mejorar futuras predicciones.
          </p>

          {!est && (
            <div className="alert warn" style={{ fontSize: 12 }}>
              Este ticket no tiene estimación generada. Las horas se registran
              igual pero no aportan a la calibración del motor.
            </div>
          )}

          {est && (
            <div
              className="card"
              style={{
                padding: 12,
                background: "var(--bg-elev-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.5 }}>
                ESTIMACIÓN AL CREAR
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {est.totalMinHours.toFixed(1)}h – {est.totalMaxHours.toFixed(1)}h
              </div>
              <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 2 }}>
                {est.totalMinBusinessDays.toFixed(1)}d – {est.totalMaxBusinessDays.toFixed(1)}d hábiles
                · confianza {est.confidence.toLowerCase()}
                {est.calibrationMode === "BOOTSTRAP" ? " · modo BOOTSTRAP" : ""}
              </div>
            </div>
          )}

          <div>
            <label className="lab" htmlFor="actualHours">
              Horas reales (incluye análisis, fix, pruebas, comunicación)
            </label>
            <input
              id="actualHours"
              type="number"
              min={0}
              step={0.5}
              placeholder="ej. 8.5"
              value={hoursStr}
              onChange={(e) => setHoursStr(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </div>

          {preview && (
            <VariancePreview
              minH={est!.totalMinHours}
              maxH={est!.totalMaxHours}
              actual={preview.actual}
              variancePct={preview.variancePct}
              withinBand={preview.withinBand}
            />
          )}

          {needsNote && (
            <div>
              <label className="lab" htmlFor="closeNote">
                Razón de la desviación grande (requerido, mín 10 caracteres)
              </label>
              <textarea
                id="closeNote"
                rows={3}
                placeholder="ej. el error tenía causa raíz en BTP, no en MM como pensábamos"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                Una desviación &gt; 50% pide razón. Esto entrena el motor con
                contexto, no solo números.
              </div>
            </div>
          )}

          {error && <div className="alert error" style={{ fontSize: 12 }}>{error}</div>}
        </div>

        <div className="tc-modal-footer">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button
            className="btn primary"
            onClick={() => onConfirm({ actualHours: hours, closeNote: note.trim() || undefined })}
            disabled={!canSubmit}
          >
            {busy ? <><span className="spinner" /> cerrando…</> : `Cerrar ticket · ${closingUser}`}
          </button>
        </div>
      </div>
    </TcModalShell>
  );
}

function previewVariance(
  est: TicketEstimatedResolution | null,
  actual: number,
): { actual: number; variancePct: number; withinBand: boolean } | null {
  if (!est || actual <= 0) return null;
  const mid = (est.totalMinHours + est.totalMaxHours) / 2;
  const variancePct = mid > 0 ? ((actual - mid) / mid) * 100 : 0;
  const withinBand = actual >= est.totalMinHours && actual <= est.totalMaxHours;
  return { actual, variancePct: +variancePct.toFixed(1), withinBand };
}

function VariancePreview({
  minH, maxH, actual, variancePct, withinBand,
}: { minH: number; maxH: number; actual: number; variancePct: number; withinBand: boolean }) {
  const absPct = Math.abs(variancePct);
  const tone = withinBand ? "ok" : absPct >= 50 ? "error" : "warn";
  const color = tone === "ok" ? "#10b981" : tone === "error" ? "#ef4444" : "#f59e0b";
  const sign = variancePct > 0 ? "+" : variancePct < 0 ? "" : "";
  const label = withinBand
    ? "dentro de la banda estimada"
    : variancePct > 0
      ? "tomó más de lo estimado"
      : "tomó menos de lo estimado";

  return (
    <div
      className="card"
      style={{
        padding: 12,
        border: `1px solid ${color}55`,
        borderRadius: 8,
        background: `linear-gradient(90deg, ${color}11, transparent)`,
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 1.5 }}>
        DESVIACIÓN
      </div>
      <div className="row" style={{ gap: 10, alignItems: "baseline", marginTop: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>
          {sign}{variancePct.toFixed(1)}%
        </div>
        <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
          {label} ({actual.toFixed(1)}h vs banda {minH.toFixed(1)}h–{maxH.toFixed(1)}h)
        </div>
      </div>
    </div>
  );
}
