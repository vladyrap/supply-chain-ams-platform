"use client";

// Hook + persistencia para Customer Responses.
// Storage por ticket: máx 10 respuestas por ticket (cleanup automático).
// Sync entre tabs vía storage event + custom event.
// G8 (v1.2.0): localStorage scoped por tenant via tenantStorage().

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CustomerResponse, CustomerResponseStatus } from "@/types/customer-response";
import { CUSTOMER_RESPONSE_STORAGE } from "@/types/customer-response";
import {
  persistCustomerResponse, updateCustomerResponseStatusApi, deleteCustomerResponseApi,
} from "@/services/customer-responses.api";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, isTenantScopedKey } from "@/lib/tenantStorage";

const STORAGE_KEY = CUSTOMER_RESPONSE_STORAGE.responses;
const EVT = "ams-customer-responses-changed";
const MAX_PER_TICKET = 10;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export interface UseCustomerResponses {
  responses: CustomerResponse[];
  byTicket: (ticketKey: string) => CustomerResponse[];
  save: (r: CustomerResponse) => void;
  updateStatus: (responseId: string, status: CustomerResponseStatus, extra?: Partial<CustomerResponse>) => void;
  remove: (responseId: string) => void;
  clearTicket: (ticketKey: string) => void;
  clearAll: () => void;
  getById: (responseId: string) => CustomerResponse | undefined;
}

export function useCustomerResponses(): UseCustomerResponses {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  const storage = useMemo(() => tenantStorage(tenantId), [tenantId]);

  const [responses, setResponses] = useState<CustomerResponse[]>([]);

  // Re-cargar cuando cambia el tenant
  useEffect(() => {
    setResponses(safeParse<CustomerResponse[]>(storage.get(STORAGE_KEY)) ?? []);
  }, [storage]);

  useEffect(() => {
    function reload() {
      setResponses(safeParse<CustomerResponse[]>(storage.get(STORAGE_KEY)) ?? []);
    }
    function onStorage(e: StorageEvent) {
      if (isTenantScopedKey(e.key, tenantId, STORAGE_KEY)) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, [storage, tenantId]);

  const persist = useCallback((next: CustomerResponse[]) => {
    setResponses(next);
    storage.set(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, [storage]);

  const byTicket: UseCustomerResponses["byTicket"] = useCallback(
    (ticketKey: string) =>
      responses
        .filter((r) => r.ticketKey === ticketKey)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [responses],
  );

  const save: UseCustomerResponses["save"] = useCallback((r) => {
    setResponses((cur) => {
      // Cap: máx 10 por ticket (descartamos los más viejos del mismo ticket)
      const sameTicket = cur.filter((x) => x.ticketKey === r.ticketKey);
      const others = cur.filter((x) => x.ticketKey !== r.ticketKey);
      const idx = sameTicket.findIndex((x) => x.responseId === r.responseId);

      let kept: CustomerResponse[];
      if (idx >= 0) {
        kept = [...sameTicket];
        kept[idx] = r;
      } else {
        kept = [r, ...sameTicket];
        if (kept.length > MAX_PER_TICKET) {
          kept = kept.slice(0, MAX_PER_TICKET);
        }
      }
      const next = [...kept, ...others];
      storage.set(STORAGE_KEY, JSON.stringify(next));
      emit();
      return next;
    });
    // Sync best-effort con backend (no bloquea — si falla, queda solo en localStorage)
    persistCustomerResponse(r).catch(() => null);
  }, [storage]);

  const updateStatus: UseCustomerResponses["updateStatus"] = useCallback(
    (responseId, status, extra) => {
      setResponses((cur) => {
        const next = cur.map((r) =>
          r.responseId === responseId ? { ...r, status, ...(extra ?? {}) } : r,
        );
        storage.set(STORAGE_KEY, JSON.stringify(next));
        emit();
        return next;
      });
      // Sync best-effort
      updateCustomerResponseStatusApi(responseId, status).catch(() => null);
    },
    [storage],
  );

  const remove: UseCustomerResponses["remove"] = useCallback((id) => {
    persist(responses.filter((r) => r.responseId !== id));
    deleteCustomerResponseApi(id).catch(() => null);
  }, [responses, persist]);

  const clearTicket: UseCustomerResponses["clearTicket"] = useCallback((k) => {
    persist(responses.filter((r) => r.ticketKey !== k));
  }, [responses, persist]);

  const clearAll: UseCustomerResponses["clearAll"] = useCallback(() => {
    persist([]);
  }, [persist]);

  const getById: UseCustomerResponses["getById"] = useCallback(
    (id) => responses.find((r) => r.responseId === id),
    [responses],
  );

  return { responses, byTicket, save, updateStatus, remove, clearTicket, clearAll, getById };
}
