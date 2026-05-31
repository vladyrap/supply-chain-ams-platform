"use client";

// Audit trail por ticket. Persistido en localStorage.
// Cualquier acción importante (clasificar, escalar, generar doc, etc.)
// llama a `record()` y queda asentada con timestamp + actor.

import { useCallback, useEffect, useState } from "react";
import {
  AUDIT_STORAGE,
  type TicketAuditEvent, type TicketAuditEventType,
} from "@/types/audit";

const EVT = "ams-audit-changed";

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
const uid = () => `ev_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export interface RecordInput {
  ticketId: string;
  eventType: TicketAuditEventType;
  title: string;
  description?: string;
  actor: string;
  actorRole?: string;
  source?: TicketAuditEvent["source"];
  metadata?: Record<string, unknown>;
}

export interface UseTicketAudit {
  events: TicketAuditEvent[];
  byTicket: (ticketId: string) => TicketAuditEvent[];
  record: (input: RecordInput) => TicketAuditEvent;
  clearForTicket: (ticketId: string) => void;
}

export function useTicketAudit(): UseTicketAudit {
  const [events, setEvents] = useState<TicketAuditEvent[]>(() => {
    if (typeof window === "undefined") return [];
    return safe<TicketAuditEvent[]>(localStorage.getItem(AUDIT_STORAGE.events)) ?? [];
  });

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      setEvents(safe<TicketAuditEvent[]>(localStorage.getItem(AUDIT_STORAGE.events)) ?? []);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === AUDIT_STORAGE.events) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  const save = useCallback((next: TicketAuditEvent[]) => {
    setEvents(next);
    if (typeof window !== "undefined") {
      // Cap a 1000 eventos para no llenar localStorage
      const capped = next.slice(0, 1000);
      localStorage.setItem(AUDIT_STORAGE.events, JSON.stringify(capped));
      emit();
    }
  }, []);

  const record: UseTicketAudit["record"] = useCallback((input) => {
    const ev: TicketAuditEvent = {
      id: uid(),
      ticketId: input.ticketId,
      eventType: input.eventType,
      title: input.title,
      description: input.description,
      actor: input.actor,
      actorRole: input.actorRole,
      source: input.source ?? "ui",
      metadata: input.metadata,
      createdAt: now(),
    };
    save([ev, ...events]);
    return ev;
  }, [events, save]);

  const byTicket = useCallback((ticketId: string) =>
    events.filter((e) => e.ticketId === ticketId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [events]);

  const clearForTicket = useCallback((ticketId: string) => {
    save(events.filter((e) => e.ticketId !== ticketId));
  }, [events, save]);

  return { events, byTicket, record, clearForTicket };
}
