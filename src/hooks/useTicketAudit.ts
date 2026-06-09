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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AUDIT_STORAGE,
  type TicketAuditEvent, type TicketAuditEventType,
} from "@/types/audit";
import {
  recordEventRemote, getByTicketRemote, isAuditBackendAvailable,
  type AuditEventRemoteRecord,
} from "@/services/audit-events.api";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, isTenantScopedKey } from "@/lib/tenantStorage";

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

// v0.14.7 — sweep one-time al cargar para dedup de spam pre-existente
// (eventos generados por el loop de versiones anteriores). Por cada
// ticket + eventType + minuto deja UN solo evento (el más reciente).
function dedupOnLoad(raw: TicketAuditEvent[]): TicketAuditEvent[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Map<string, TicketAuditEvent>();
  // ordenamos desc por createdAt para que el más reciente gane
  const sorted = [...raw].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const e of sorted) {
    const minute = (e.createdAt || "").slice(0, 16);
    const key = `${e.ticketId}|${e.eventType}|${minute}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return Array.from(seen.values());
}

export function useTicketAudit(): UseTicketAudit {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  const storage = useMemo(() => tenantStorage(tenantId), [tenantId]);

  const [events, setEvents] = useState<TicketAuditEvent[]>([]);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Carga inicial + re-carga cuando cambia el tenant
  useEffect(() => {
    const raw = safe<TicketAuditEvent[]>(storage.get(AUDIT_STORAGE.events)) ?? [];
    const cleaned = dedupOnLoad(raw);
    if (cleaned.length !== raw.length) {
      try {
        storage.set(AUDIT_STORAGE.events, JSON.stringify(cleaned));
        // eslint-disable-next-line no-console
        console.info(`[audit] dedup limpió ${raw.length - cleaned.length} eventos duplicados`);
      } catch { /* ignore */ }
    }
    setEvents(cleaned);
  }, [storage]);

  useEffect(() => {
    function reload() {
      setEvents(safe<TicketAuditEvent[]>(storage.get(AUDIT_STORAGE.events)) ?? []);
    }
    function onStorage(e: StorageEvent) {
      if (isTenantScopedKey(e.key, tenantId, AUDIT_STORAGE.events)) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    // Background check del backend para setear el flag inicial
    isAuditBackendAvailable().then((ok) => setIsUsingFallback(!ok));
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, [storage, tenantId]);

  // v0.14.7 — TODOS los callbacks usan functional setters → deps vacías → refs
  // estables. Esto rompe loops downstream: hooks que tienen `record` en deps
  // de useCallback/useEffect ya NO se re-disparan en cada record().

  const persistAndEmit = useCallback((next: TicketAuditEvent[]) => {
    const capped = next.slice(0, 1000);
    storage.set(AUDIT_STORAGE.events, JSON.stringify(capped));
    emit();
  }, [storage]);

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
    // 1) Mirror local con functional updater (no depende de events closure)
    setEvents((prev) => {
      const next = [ev, ...prev];
      persistAndEmit(next);
      return next;
    });
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
  }, [persistAndEmit]); // stable: persistAndEmit es estable

  const byTicket = useCallback((ticketId: string) =>
    events.filter((e) => e.ticketId === ticketId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [events]);

  const clearForTicket = useCallback((ticketId: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.ticketId !== ticketId);
      persistAndEmit(next);
      return next;
    });
  }, [persistAndEmit]);

  const refreshFromBackend: UseTicketAudit["refreshFromBackend"] = useCallback(async (ticketId) => {
    try {
      const remote = await getByTicketRemote(ticketId);
      if (remote.length === 0) return;
      const remoteLocal = remote.map(remoteToLocal);
      const knownIds = new Set(remoteLocal.map((e) => e.id));
      setEvents((prev) => {
        const merged = [
          ...remoteLocal,
          ...prev.filter((e) => e.ticketId === ticketId && !knownIds.has(e.id)),
          ...prev.filter((e) => e.ticketId !== ticketId),
        ];
        persistAndEmit(merged);
        return merged;
      });
      setIsUsingFallback(false);
    } catch {
      setIsUsingFallback(true);
    }
  }, [persistAndEmit]);

  return { events, byTicket, record, clearForTicket, isUsingFallback, refreshFromBackend };
}
