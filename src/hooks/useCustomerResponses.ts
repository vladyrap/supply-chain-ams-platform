"use client";

// Hook + persistencia para Customer Responses.
// Storage por ticket: máx 10 respuestas por ticket (cleanup automático).
// Sync entre tabs vía storage event + custom event.

import { useCallback, useEffect, useState } from "react";
import type { CustomerResponse, CustomerResponseStatus } from "@/types/customer-response";
import { CUSTOMER_RESPONSE_STORAGE } from "@/types/customer-response";
import {
  persistCustomerResponse, updateCustomerResponseStatusApi, deleteCustomerResponseApi,
  fetchCustomerResponsesByTicket,
} from "@/services/customer-responses.api";

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
  const [responses, setResponses] = useState<CustomerResponse[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParse<CustomerResponse[]>(localStorage.getItem(STORAGE_KEY)) ?? [];
  });

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      const fresh = safeParse<CustomerResponse[]>(localStorage.getItem(STORAGE_KEY)) ?? [];
      setResponses(fresh);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  const persist = useCallback((next: CustomerResponse[]) => {
    setResponses(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      emit();
    }
  }, []);

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
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        emit();
      }
      return next;
    });
    // Sync best-effort con backend (no bloquea — si falla, queda solo en localStorage)
    persistCustomerResponse(r).catch(() => null);
  }, []);

  const updateStatus: UseCustomerResponses["updateStatus"] = useCallback(
    (responseId, status, extra) => {
      setResponses((cur) => {
        const next = cur.map((r) =>
          r.responseId === responseId ? { ...r, status, ...(extra ?? {}) } : r,
        );
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          emit();
        }
        return next;
      });
      // Sync best-effort
      updateCustomerResponseStatusApi(responseId, status).catch(() => null);
    },
    [],
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
