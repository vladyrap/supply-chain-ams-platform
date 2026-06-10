// =============================================================================
// tickets-bulk-pdf.ts — Descarga masiva: ZIP con 1 PDF por ticket
// =============================================================================
// v1.2.7-prod. Genera N PDFs (uno por ticket) y los empaqueta en un ZIP.
// =============================================================================

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Ticket } from "@/services/tickets.api";
import type { TicketAuditEvent } from "@/types/audit";
import { generateTicketPDF, pdfFileNameFor } from "./ticket-pdf";

export interface BulkPdfOptions {
  /** Función que retorna los eventos de audit para un ticketId dado. */
  auditByTicket?: (ticketId: string) => TicketAuditEvent[];
  /** Callback de progreso: 0..1. */
  onProgress?: (done: number, total: number) => void;
}

/** Descarga 1 PDF por ticket dentro de un ZIP. */
export async function downloadTicketsZip(tickets: Ticket[], opts: BulkPdfOptions = {}): Promise<void> {
  if (!tickets || tickets.length === 0) {
    throw new Error("No hay tickets para exportar");
  }
  const zip = new JSZip();
  const folder = zip.folder("tickets-ams");
  if (!folder) throw new Error("No se pudo crear la carpeta del ZIP");

  const usedNames = new Set<string>();
  let done = 0;
  for (const ticket of tickets) {
    const events = opts.auditByTicket ? opts.auditByTicket(ticket.key) : [];
    const doc = generateTicketPDF(ticket, { auditEvents: events });
    const buffer = doc.output("arraybuffer");

    // evitar colisiones de nombres
    let name = pdfFileNameFor(ticket);
    let i = 2;
    while (usedNames.has(name)) {
      name = name.replace(/\.pdf$/i, `-${i}.pdf`);
      i++;
    }
    usedNames.add(name);

    folder.file(name, buffer);
    done++;
    opts.onProgress?.(done, tickets.length);
    // Ceder al event loop cada 5 PDFs para no congelar la UI
    if (done % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `tickets-ams-${stamp}.zip`);
}

/** Descarga un único PDF de un ticket. */
export async function downloadSingleTicketPdf(
  ticket: Ticket,
  opts: Pick<BulkPdfOptions, "auditByTicket"> = {},
): Promise<void> {
  const events = opts.auditByTicket ? opts.auditByTicket(ticket.key) : [];
  const doc = generateTicketPDF(ticket, { auditEvents: events });
  const blob = doc.output("blob");
  saveAs(blob, pdfFileNameFor(ticket));
}
