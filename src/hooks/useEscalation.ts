"use client";

// Hook único que gobierna todo el módulo Escalation N2.
// MODO OFFLINE-FIRST:
// - Estado en memoria + cache en localStorage.
// - Si hay backend disponible (escalation.api), hidrata desde Postgres al montar
//   y sincroniza cada mutación. Si el backend no responde, sigue funcionando local.
// - Esto permite que la UI nunca quede bloqueada y soporte trabajo sin conexión.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ESCALATION_STORAGE,
  type EscalationRule, type N2Responsible, type EscalationRecord,
  type ItsmConnectorConfig, type EscalationSettings,
  type EscalationStatus, type EscalationChannel, type EscalationEvent,
  type EscalationCandidate, type ItsmTicketPayload,
} from "@/types/escalation";
import { useTenant } from "@/context/TenantContext";
import { tenantStorage, type TenantScopedStorage } from "@/lib/tenantStorage";
import {
  buildSeedResponsibles, buildSeedRules, buildSeedRecords,
  buildSeedConnectors, buildSeedSettings,
} from "@/lib/escalation/seedData";
import {
  evaluateEscalationRules, toCandidate,
  buildJiraPayload, buildServiceNowPayload,
  generateEscalationSummary, generateClientSummary,
} from "@/utils/escalation-engine";
import type { IncidentSummary, IncidentDetail } from "@/services/agent.api";
import * as api from "@/services/escalation.api";

// Logger ligero. Si querés silenciar todo el módulo, cambialo a no-op.
const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[escalation]", ...a); },
};

type AnyIncident = IncidentSummary | IncidentDetail;

// ============================================================
// Persistencia local (cache) — scoped por tenant (G8 v1.2.0)
// ============================================================

function loadList<T>(storage: TenantScopedStorage, key: string, seed: () => T[]): T[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = storage.get(key);
    if (!raw) {
      const s = seed();
      storage.set(key, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed();
  }
}
function loadObj<T>(storage: TenantScopedStorage, key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();
  try {
    const raw = storage.get(key);
    if (!raw) {
      const s = seed();
      storage.set(key, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed();
  }
}
function saveAndEmit(storage: TenantScopedStorage, key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    storage.set(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ams-escalation-changed", { detail: { key } }));
  } catch { /* ignore */ }
}

// Fire-and-forget sync con el backend; nunca rompe la UI si falla.
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("escalation backend sync failed (using local cache):", err?.message || err));
}

// ============================================================
// Hook
// ============================================================

export function useEscalation() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || "default";
  // Ref para que los useCallback con [] deps sigan apuntando al storage actual.
  const storageRef = useRef<TenantScopedStorage>(tenantStorage(tenantId));
  useEffect(() => { storageRef.current = tenantStorage(tenantId); }, [tenantId]);

  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [responsibles, setResponsibles] = useState<N2Responsible[]>([]);
  const [records, setRecords] = useState<EscalationRecord[]>([]);
  const [connectors, setConnectors] = useState<ItsmConnectorConfig>(() => buildSeedConnectors());
  const [settings, setSettings] = useState<EscalationSettings>(() => buildSeedSettings());
  const [backendOnline, setBackendOnline] = useState(false);

  // Cargar (y reload al cambiar tenant)
  useEffect(() => {
    const st = storageRef.current;
    setRules(loadList(st, ESCALATION_STORAGE.rules, buildSeedRules));
    setResponsibles(loadList(st, ESCALATION_STORAGE.responsibles, buildSeedResponsibles));
    setRecords(loadList(st, ESCALATION_STORAGE.records, buildSeedRecords));
    setConnectors(loadObj(st, ESCALATION_STORAGE.connectors, buildSeedConnectors));
    setSettings(loadObj(st, ESCALATION_STORAGE.settings, buildSeedSettings));
  }, [tenantId]);

  // -----------------------------
  // Hidratar desde backend al montar (offline-first)
  // -----------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await api.getSnapshot();
        if (cancelled) return;
        setRules(snap.rules);
        setResponsibles(snap.responsibles);
        setRecords(snap.records);
        setConnectors(snap.connectors);
        setSettings(snap.settings);
        // Refrescar cache local con la verdad del servidor
        saveAndEmit(storageRef.current, ESCALATION_STORAGE.rules, snap.rules);
        saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, snap.responsibles);
        saveAndEmit(storageRef.current, ESCALATION_STORAGE.records, snap.records);
        saveAndEmit(storageRef.current, ESCALATION_STORAGE.connectors, snap.connectors);
        saveAndEmit(storageRef.current, ESCALATION_STORAGE.settings, snap.settings);
        setBackendOnline(true);
      } catch (err) {
        log.debug("escalation backend offline, using localStorage cache:", (err as Error)?.message);
        setBackendOnline(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync entre tabs y otros componentes
  useEffect(() => {
    const refresh = () => {
      setRules(loadList(storageRef.current, ESCALATION_STORAGE.rules, buildSeedRules));
      setResponsibles(loadList(storageRef.current, ESCALATION_STORAGE.responsibles, buildSeedResponsibles));
      setRecords(loadList(storageRef.current, ESCALATION_STORAGE.records, buildSeedRecords));
      setConnectors(loadObj(storageRef.current, ESCALATION_STORAGE.connectors, buildSeedConnectors));
      setSettings(loadObj(storageRef.current, ESCALATION_STORAGE.settings, buildSeedSettings));
    };
    window.addEventListener("ams-escalation-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ams-escalation-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // -----------------------------
  // CRUD reglas
  // -----------------------------
  const upsertRule = useCallback((rule: EscalationRule) => {
    const updated = { ...rule, updatedAt: new Date().toISOString() };
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === rule.id);
      const next = idx >= 0 ? prev.map((r, i) => (i === idx ? updated : r)) : [...prev, updated];
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.rules, next);
      return next;
    });
    fireSync(api.upsertRule(updated));
  }, []);
  const removeRule = useCallback((id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.rules, next);
      return next;
    });
    fireSync(api.deleteRule(id));
  }, []);

  // -----------------------------
  // CRUD responsables
  // -----------------------------
  const upsertResponsible = useCallback((r: N2Responsible) => {
    const updated = { ...r, updatedAt: new Date().toISOString() };
    setResponsibles((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id);
      const next = idx >= 0 ? prev.map((x, i) => (i === idx ? updated : x)) : [...prev, updated];
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, next);
      return next;
    });
    fireSync(api.upsertResponsible(updated));
  }, []);
  const removeResponsible = useCallback((id: string) => {
    setResponsibles((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, next);
      return next;
    });
    fireSync(api.deleteResponsible(id));
  }, []);
  const toggleResponsibleActive = useCallback((id: string) => {
    setResponsibles((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const updated = { ...target, active: !target.active, updatedAt: new Date().toISOString() };
      const next = prev.map((r) => r.id === id ? updated : r);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, next);
      fireSync(api.upsertResponsible(updated));
      return next;
    });
  }, []);

  // -----------------------------
  // Conectores + settings
  // -----------------------------
  const updateConnectors = useCallback((patch: Partial<ItsmConnectorConfig>) => {
    setConnectors((prev) => {
      const next = { ...prev, ...patch };
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.connectors, next);
      return next;
    });
    fireSync(api.updateConnectors(patch));
  }, []);
  const updateSettings = useCallback((patch: Partial<EscalationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.settings, next);
      return next;
    });
    fireSync(api.updateSettings(patch));
  }, []);

  // -----------------------------
  // Sugerencia / candidato
  // -----------------------------
  const suggestEscalation = useCallback((inc: AnyIncident): EscalationCandidate => {
    return toCandidate(inc, rules, responsibles, records, {
      useAvailability: settings.useAvailabilityForAssignment,
      useWorkload: settings.useWorkloadForAssignment,
    });
  }, [rules, responsibles, records, settings]);

  const shouldEscalateIncident = useCallback((inc: AnyIncident): boolean => {
    if (records.some((r) => r.incidentId === inc.id)) return false;
    return !!evaluateEscalationRules(inc, rules, records);
  }, [rules, records]);

  // -----------------------------
  // Creación / aprobación
  // -----------------------------
  const nextEscalationNumber = useCallback((): string => {
    const year = new Date().getFullYear();
    const sameYear = records.filter((r) => r.escalationNumber.includes(String(year)));
    const n = sameYear.length + 1;
    return `ESC-${year}-${String(n).padStart(3, "0")}`;
  }, [records]);

  const createEscalation = useCallback((opts: {
    incident: AnyIncident;
    reason: string;
    summary?: string;
    clientSummary?: string;
    assigneeId?: string;
    channel: EscalationChannel;
    slaMinutes: number;
    requiresApproval: boolean;
    ruleId?: string;
    createdBy: string;
  }): EscalationRecord => {
    const assignee = opts.assigneeId ? responsibles.find((r) => r.id === opts.assigneeId) : null;
    const now = new Date();
    const slaTarget = new Date(now.getTime() + opts.slaMinutes * 60_000).toISOString();
    const summary = opts.summary || generateEscalationSummary(opts.incident, opts.reason);
    const clientSummary = opts.clientSummary || (settings.notifyClientOnEscalation ? generateClientSummary(opts.incident, assignee) : undefined);

    const initialStatus: EscalationStatus = opts.requiresApproval ? "REVIEW_REQUIRED" : "READY_TO_ESCALATE";
    const initialEvents: EscalationEvent[] = [
      { type: "ESCALATION_CREATED", at: now.toISOString(), by: opts.createdBy, note: opts.ruleId ? `Disparada por regla ${opts.ruleId}` : "Escalación manual" },
    ];
    if (opts.requiresApproval) initialEvents.push({ type: "APPROVAL_REQUESTED", at: now.toISOString(), by: opts.createdBy });

    const rec: EscalationRecord = {
      id: `esc_${now.getTime()}`,
      incidentId: opts.incident.id,
      escalationNumber: nextEscalationNumber(),
      fromLevel: 1, toLevel: 2,
      reason: opts.reason,
      summary,
      clientSummary,
      assignedTo: assignee?.id,
      assignedToName: assignee?.name,
      assignedTeam: assignee?.team,
      channel: opts.channel,
      ruleId: opts.ruleId,
      status: initialStatus,
      slaTarget,
      slaMinutes: opts.slaMinutes,
      createdBy: opts.createdBy,
      requiresApproval: opts.requiresApproval,
      mode: "DEMO",
      events: initialEvents,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setRecords((prev) => {
      const next = [rec, ...prev];
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.records, next);
      return next;
    });
    fireSync(api.createRecord(rec));
    return rec;
  }, [responsibles, nextEscalationNumber, settings]);

  const _patchRecord = useCallback((id: string, patch: (r: EscalationRecord) => EscalationRecord) => {
    let updated: EscalationRecord | null = null;
    setRecords((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        updated = { ...patch(r), updatedAt: new Date().toISOString() };
        return updated;
      });
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.records, next);
      return next;
    });
    if (updated) fireSync(api.updateRecord(id, updated));
  }, []);

  const approveEscalation = useCallback((id: string, by: string) => {
    _patchRecord(id, (r) => ({
      ...r,
      status: "READY_TO_ESCALATE",
      approvedBy: by,
      approvedAt: new Date().toISOString(),
      events: [...r.events, { type: "APPROVED", at: new Date().toISOString(), by }],
    }));
  }, [_patchRecord]);

  const rejectEscalation = useCallback((id: string, by: string, note?: string) => {
    _patchRecord(id, (r) => ({
      ...r,
      status: "CANCELLED",
      events: [...r.events, { type: "REJECTED", at: new Date().toISOString(), by, note }],
    }));
  }, [_patchRecord]);

  // -----------------------------
  // Simulación Jira / ServiceNow
  // -----------------------------
  const createJiraTicketDemo = useCallback((id: string, inc: AnyIncident, by: string) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return null;
    const assignee = rec.assignedTo ? responsibles.find((r) => r.id === rec.assignedTo) ?? null : null;
    const payloadObj = buildJiraPayload(inc, rec.summary, assignee, connectors.jira);
    const num = 1000 + Math.floor(Math.random() * 9000);
    const ticketId = `${connectors.jira.projectKey || "AMS"}-${num}`;
    const url = `${connectors.jira.baseUrl || "https://jira.demo.local"}/browse/${ticketId}`;
    const payload: ItsmTicketPayload = { channel: "JIRA", payload: payloadObj };
    _patchRecord(id, (r) => ({
      ...r,
      status: "ESCALATED",
      externalTicketId: ticketId,
      externalTicketUrl: url,
      payload,
      events: [...r.events, { type: "SENT_TO_JIRA", at: new Date().toISOString(), by, note: `Ticket simulado ${ticketId}` }],
    }));
    return { ticketId, url, payload };
  }, [records, responsibles, connectors, _patchRecord]);

  const createServiceNowTicketDemo = useCallback((id: string, inc: AnyIncident, by: string) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return null;
    const assignee = rec.assignedTo ? responsibles.find((r) => r.id === rec.assignedTo) ?? null : null;
    const payloadObj = buildServiceNowPayload(inc, rec.summary, assignee, connectors.serviceNow);
    const ticketId = `INC${String(1_000_000 + Math.floor(Math.random() * 9_000_000)).padStart(7, "0")}`;
    const url = `${connectors.serviceNow.instanceUrl || "https://servicenow.demo.local"}/nav_to.do?uri=incident.do?sys_id=${ticketId}`;
    const payload: ItsmTicketPayload = { channel: "SERVICENOW", payload: payloadObj };
    _patchRecord(id, (r) => ({
      ...r,
      status: "ESCALATED",
      externalTicketId: ticketId,
      externalTicketUrl: url,
      payload,
      events: [...r.events, { type: "SENT_TO_SERVICENOW", at: new Date().toISOString(), by, note: `Ticket simulado ${ticketId}` }],
    }));
    return { ticketId, url, payload };
  }, [records, responsibles, connectors, _patchRecord]);

  const assignToN2 = useCallback((id: string, assigneeId: string, by: string) => {
    const a = responsibles.find((r) => r.id === assigneeId);
    if (!a) return;
    _patchRecord(id, (r) => ({
      ...r,
      assignedTo: a.id,
      assignedToName: a.name,
      assignedTeam: a.team,
      status: r.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "ASSIGNED_TO_N2",
      events: [...r.events, { type: "ASSIGNED_TO_N2", at: new Date().toISOString(), by, note: `Asignado a ${a.name}` }],
    }));
  }, [responsibles, _patchRecord]);

  const updateEscalationStatus = useCallback((id: string, status: EscalationStatus, by: string, note?: string) => {
    const evMap: Record<EscalationStatus, EscalationEvent["type"]> = {
      NEW: "UPDATED",
      REVIEW_REQUIRED: "UPDATED",
      READY_TO_ESCALATE: "UPDATED",
      ESCALATED: "UPDATED",
      ASSIGNED_TO_N2: "ASSIGNED_TO_N2",
      IN_PROGRESS_N2: "UPDATED",
      RESOLVED_BY_N2: "RESOLVED",
      RETURNED_TO_N1: "RETURNED_TO_N1",
      CANCELLED: "REJECTED",
    };
    _patchRecord(id, (r) => ({
      ...r,
      status,
      events: [...r.events, { type: evMap[status], at: new Date().toISOString(), by, note }],
    }));
  }, [_patchRecord]);

  const createEscalationSummary = useCallback((inc: AnyIncident, reason?: string): string => {
    return generateEscalationSummary(inc, reason);
  }, []);

  const resetDemoEscalationData = useCallback(async () => {
    // Si hay backend, le pedimos al server que resetee y traiga snapshot fresco
    try {
      const snap = await api.resetDemo();
      setRules(snap.rules);
      setResponsibles(snap.responsibles);
      setRecords(snap.records);
      setConnectors(snap.connectors);
      setSettings(snap.settings);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.rules, snap.rules);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, snap.responsibles);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.records, snap.records);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.connectors, snap.connectors);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.settings, snap.settings);
      setBackendOnline(true);
      return;
    } catch {
      // Fallback local
      const r = buildSeedRules(); const p = buildSeedResponsibles();
      const h = buildSeedRecords(); const c = buildSeedConnectors(); const s = buildSeedSettings();
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.rules, r);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.responsibles, p);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.records, h);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.connectors, c);
      saveAndEmit(storageRef.current, ESCALATION_STORAGE.settings, s);
      setRules(r); setResponsibles(p); setRecords(h); setConnectors(c); setSettings(s);
    }
  }, []);

  // -----------------------------
  // Métricas
  // -----------------------------
  const metrics = useMemo(() => {
    const byModule = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    const byClient = new Map<string, number>();
    const byChannel = new Map<string, number>();
    const byResp = new Map<string, number>();
    const byRule = new Map<string, number>();
    let jiraCount = 0, sNowCount = 0, pendingApproval = 0, assignedActive = 0;
    let totalTimeToAssign = 0, timeToAssignCount = 0;
    let totalTimeToResolve = 0, timeToResolveCount = 0;

    for (const r of records) {
      bySeverity.set(r.summary.includes("[P1]") ? "P1" : r.summary.includes("[P2]") ? "P2" : r.summary.includes("[P3]") ? "P3" : "P4",
        (bySeverity.get(r.summary.includes("[P1]") ? "P1" : r.summary.includes("[P2]") ? "P2" : r.summary.includes("[P3]") ? "P3" : "P4") || 0) + 1);
      if (r.assignedToName) byResp.set(r.assignedToName, (byResp.get(r.assignedToName) || 0) + 1);
      if (r.ruleId) byRule.set(r.ruleId, (byRule.get(r.ruleId) || 0) + 1);
      byChannel.set(r.channel, (byChannel.get(r.channel) || 0) + 1);
      const sevFromSummary = r.summary.match(/SAP ([A-Z_]+)/)?.[1] || (r.assignedTeam || "—");
      const modGuess = r.summary.match(/Módulo SAP: ([A-Z_]+)/)?.[1] || sevFromSummary;
      if (modGuess) byModule.set(modGuess, (byModule.get(modGuess) || 0) + 1);

      if (r.channel === "JIRA" && r.externalTicketId) jiraCount++;
      if (r.channel === "SERVICENOW" && r.externalTicketId) sNowCount++;
      if (r.status === "REVIEW_REQUIRED") pendingApproval++;
      if (["ASSIGNED_TO_N2", "IN_PROGRESS_N2"].includes(r.status)) assignedActive++;

      const createdMs = new Date(r.createdAt).getTime();
      const assignEv = r.events.find((e) => e.type === "ASSIGNED_TO_N2");
      if (assignEv) {
        totalTimeToAssign += (new Date(assignEv.at).getTime() - createdMs);
        timeToAssignCount++;
      }
      const resolvedEv = r.events.find((e) => e.type === "RESOLVED");
      if (resolvedEv) {
        totalTimeToResolve += (new Date(resolvedEv.at).getTime() - createdMs);
        timeToResolveCount++;
      }

      const cli = r.summary.match(/Cliente: ([^\n]+)/)?.[1]?.trim();
      if (cli && cli !== "—") byClient.set(cli, (byClient.get(cli) || 0) + 1);
    }

    return {
      total: records.length,
      pendingApproval,
      assignedActive,
      byModule:   Object.fromEntries(byModule.entries()),
      bySeverity: Object.fromEntries(bySeverity.entries()),
      byClient:   Object.fromEntries(byClient.entries()),
      byChannel:  Object.fromEntries(byChannel.entries()),
      topResponsible: [...byResp.entries()].sort((a, b) => b[1] - a[1])[0] || null,
      topRule:        [...byRule.entries()].sort((a, b) => b[1] - a[1])[0] || null,
      jiraCount, serviceNowCount: sNowCount,
      avgTimeToAssignMinutes: timeToAssignCount ? Math.round(totalTimeToAssign / timeToAssignCount / 60_000) : 0,
      avgTimeToResolveMinutes: timeToResolveCount ? Math.round(totalTimeToResolve / timeToResolveCount / 60_000) : 0,
    };
  }, [records]);

  return {
    // estado
    rules, responsibles, records, connectors, settings, metrics, backendOnline,
    // CRUD reglas
    upsertRule, removeRule,
    // CRUD responsables
    upsertResponsible, removeResponsible, toggleResponsibleActive,
    // conectores + settings
    updateConnectors, updateSettings,
    // candidatos + recomendación
    suggestEscalation, shouldEscalateIncident,
    // creación / flujo
    createEscalation, approveEscalation, rejectEscalation,
    createJiraTicketDemo, createServiceNowTicketDemo,
    assignToN2, updateEscalationStatus, createEscalationSummary,
    // util
    resetDemoEscalationData,
  };
}
export type UseEscalation = ReturnType<typeof useEscalation>;
