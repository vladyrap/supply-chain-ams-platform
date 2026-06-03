"use client";

// =============================================================================
// useTicketAudit — Audit trail por ticket
// =============================================================================
// DH v0.9: ahora intenta backend primero, fallback localStorage si falla.
// - Si backend responde OK → registra ahí (canonical) Y en localStorage (mirror).
// - Si backend falla → solo localStorage + `isUsingFallback = true`.
// - El UI puede leer `isUsingFallback` para mostrar indicador "offline".
//
// La lectura inicial sigue siendo localStorage (más rápida + offline-friendly).
// Hidratación opcional desde backend con `byTicketRemote()`.
//
// NO borra datos locales automáticamente. El user mantiene control con
// `clearForTicket()` (solo borra local).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import {
  AUDIT_STORAGE,
  type TicketAuditEvent, type TicketAuditEventType,
} from "@/types/audit";
import {
  recordEventRemote, getByTicketRemote, isAuditBackendAvailable,
  type AuditEventRemoteRecord,
} from "@/services/audit-events.api";

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

/** Convierte AuditEventRemoteRecord (backend) → TicketAuditEvent (legacy local). */
function remoteToLocal(r: AuditEventRemoteRecord): TicketAuditEvent {
  return {
    id: r.id,
    ticketId: r.ticketId ?? "",
    eventType: r.eventType as TicketAuditEventType,
    title: (r.payload as { title?: string })?.title ?? r.eventType,
    description: (r.payload as { description?: string })?.description,
    actor: r.actorName ?? r.actorUserId ?? "system",
    actorRole: r.actorRole ?? undefined,
    source: (r.source as TicketAuditEvent["source"]) ?? "system",
    metadata: r.payload as Record<string, unknown> | undefined,
    createdAt: r.createdAt,
  };
}

/** Categoría inferida desde eventType (best-effort para backend filtering). */
function inferCategory(eventType: TicketAuditEventType): string {
  const t = eventType as string;
  if (t.startsWith("CUSTOMER_RESPONSE_"))     return "customer_response";
  if (t.startsWith("N2_") || t.startsWith("ESCAL")) return "escalation";
  if (t.startsWith("KB_CURATION_") || t.includes("KNOWLEDGE")) return "knowledge";
  if (t.includes("ESTIMATE") || t.includes("ESTIMATION")) return "estimation";
  if (t.includes("QUALITY"))                  return "quality";
  if (t.includes("VISUAL"))                   return "intelligence";
  if (t.startsWith("DEMO_"))                  return "general";
  if (t === "DOCUMENT_GENERATED")             return "document";
  if (t === "TEST_CASE_CREATED" || t === "TEST_SCRIPT_GENERATED") return "testing";
  if (t === "PLAYBOOK_RECOMMENDED" || t === "PLAYBOOK_SUGGESTED") return "playbook";
  return "ticket";
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
  /** True si la última escritura cayó al fallback local porque backend falló. */
  isUsingFallback: boolean;
  /** Carga eventos del ticket desde backend y los mezcla con local. */
  refreshFromBackend: (ticketId: string) => Promise<void>;
}

export function useTicketAudit(): UseTicketAudit {
  const [events, setEvents] = useState<TicketAuditEvent[]>(() => {
    if (typeof window === "undefined") return [];
    return safe<TicketAuditEvent[]>(localStorage.getItem(AUDIT_STORAGE.events)) ?? [];
  });
  const [isUsingFallback, setIsUsingFallback] = useState(false);

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
    // Background check del backend para setear el flag inicial
    isAuditBackendAvailable().then((ok) => setIsUsingFallback(!ok));
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
    // 1) Mirror local PRIMERO — no bloqueamos UI esperando backend
    save([ev, ...events]);
    // 2) Backend best-effort en background
    recordEventRemote({
      eventType: input.eventType,
      category: inferCategory(input.eventType),
      severity: "info",
      source: input.source ?? "ui",
      ticketId: input.ticketId,
      actorName: input.actor,
      actorRole: input.actorRole,
      payload: {
        title: input.title,
        description: input.description,
        ...(input.metadata ?? {}),
      },
    })
      .then(() => setIsUsingFallback(false))
      .catch(() => setIsUsingFallback(true));
    return ev;
  }, [events, save]);

  const byTicket = useCallback((ticketId: string) =>
    events.filter((e) => e.ticketId === ticketId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [events]);

  const clearForTicket = useCallback((ticketId: string) => {
    save(events.filter((e) => e.ticketId !== ticketId));
  }, [events, save]);

  const refreshFromBackend: UseTicketAudit["refreshFromBackend"] = useCallback(async (ticketId) => {
    try {
      const remote = await getByTicketRemote(ticketId);
      if (remote.length === 0) return;
      // Merge: backend wins por id, sino agregar al final
      const remoteLocal = remote.map(remoteToLocal);
      const knownIds = new Set(remoteLocal.map((e) => e.id));
      const merged = [
        ...remoteLocal,
        ...events.filter((e) => e.ticketId === ticketId && !knownIds.has(e.id)),
        ...events.filter((e) => e.ticketId !== ticketId),
      ];
      save(merged);
      setIsUsingFallback(false);
    } catch {
      setIsUsingFallback(true);
    }
  }, [events, save]);

  return { events, byTicket, record, clearForTicket, isUsingFallback, refreshFromBackend };
}
