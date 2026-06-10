"use client";

// =============================================================================
// TicketPdfButton — Botón para descargar 1 ticket o N tickets como PDF/ZIP
// =============================================================================
// v1.2.7-prod. Dos modos:
//   - mode="single": descarga 1 PDF del ticket
//   - mode="bulk":   descarga ZIP con 1 PDF por cada ticket de la lista
// =============================================================================

import { useCallback, useState } from "react";
import type { Ticket } from "@/services/tickets.api";
import { useTicketAudit } from "@/hooks/useTicketAudit";
import { downloadSingleTicketPdf, downloadTicketsZip } from "@/lib/tickets-bulk-pdf";

type Props =
  | {
      mode: "single";
      ticket: Ticket;
      tickets?: never;
      label?: string;
      compact?: boolean;
    }
  | {
      mode: "bulk";
      tickets: Ticket[];
      ticket?: never;
      label?: string;
      compact?: boolean;
    };

export default function TicketPdfButton(props: Props) {
  const { byTicket } = useTicketAudit();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const auditByTicket = useCallback((id: string) => byTicket(id), [byTicket]);

  const onClick = async () => {
    setBusy(true);
    setProgress(null);
    try {
      if (props.mode === "single") {
        await downloadSingleTicketPdf(props.ticket, { auditByTicket });
      } else {
        await downloadTicketsZip(props.tickets, {
          auditByTicket,
          onProgress: (done, total) => setProgress({ done, total }),
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[pdf]", err);
      alert(`No se pudo generar el PDF: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const isBulk = props.mode === "bulk";
  const count = isBulk ? (props.tickets?.length ?? 0) : 0;
  const disabled = busy || (isBulk && count === 0);

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: props.compact ? "4px 10px" : "8px 14px",
    borderRadius: 8,
    border: "1px solid rgba(34, 211, 238, 0.3)",
    background: busy
      ? "linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(167, 139, 250, 0.15))"
      : "linear-gradient(135deg, rgba(34, 211, 238, 0.08), rgba(167, 139, 250, 0.08))",
    color: "#22d3ee",
    fontSize: props.compact ? 12 : 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled && !busy ? 0.4 : 1,
    transition: "all 150ms",
  };

  const defaultLabel = isBulk
    ? busy
      ? progress
        ? `Generando ${progress.done}/${progress.total}…`
        : "Comprimiendo…"
      : `Descargar ZIP (${count})`
    : busy
      ? "Generando…"
      : "Descargar PDF";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={baseStyle}
      title={
        isBulk
          ? "Descargar 1 ZIP con 1 PDF por cada ticket de la lista"
          : "Descargar este ticket como PDF con todo su análisis"
      }
    >
      <span aria-hidden style={{ fontSize: props.compact ? 13 : 15 }}>
        {isBulk ? "📦" : "📥"}
      </span>
      <span>{props.label ?? defaultLabel}</span>
    </button>
  );
}
