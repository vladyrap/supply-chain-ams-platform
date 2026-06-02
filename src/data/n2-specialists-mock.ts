// =============================================================================
// N2 Specialists — dataset mock con histórico de casos
// =============================================================================
// 8 especialistas N2 con skills + módulos cubiertos + workload simulado +
// historial de casos resueltos. Sirve para el matching del motor N2
// Escalation Intelligence cuando no hay backend conectado.
//
// En producción reemplazar por SELECT de n2_responsibles + JOIN con
// escalation_records cerrados por cada specialist.
// =============================================================================

import type { N2Responsible } from "@/types/escalation";

/** Histórico de casos resueltos por un specialist (para scoring). */
export interface N2SpecialistHistory {
  responsibleId: string;
  recentCasesCount: number;            // últimos 90 días
  avgResolutionHours: number;
  withinBandPct: number;                // % within-band de estimaciones
  topModules: string[];
  strongIssueTypes: string[];
  customerSatisfactionScore: number;    // 0-100
}

const baseSpec = (overrides: Partial<N2Responsible>): N2Responsible => ({
  id: "n2_xxx",
  name: "—",
  email: "—@ams.cl",
  role: "N2_FUNCTIONAL_CONSULTANT",
  team: "AMS Core",
  sapModules: [],
  processes: [],
  clients: [],
  countries: ["CL"],
  serviceLevels: ["STANDARD", "PREMIUM", "ENTERPRISE"],
  availabilityStatus: "AVAILABLE",
  workingHours: "08:00-18:00 CLT",
  timezone: "America/Santiago",
  maxActiveCases: 5,
  currentActiveCases: 0,
  skills: [],
  active: true,
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-06-01T10:00:00Z",
  ...overrides,
});

export const N2_SPECIALISTS_MOCK: N2Responsible[] = [
  baseSpec({
    id: "n2_001", name: "María Soto", email: "maria.soto@ams.cl",
    role: "N2_FUNCTIONAL_CONSULTANT", team: "MM Squad",
    skills: ["MM", "Procure to Pay", "OMB1", "MIGO", "MIRO", "customizing", "spro"],
    sapModules: ["MM"], processes: ["Procure to Pay"],
    clients: ["ACME", "TechCorp"],
    maxActiveCases: 6, currentActiveCases: 3,
  }),
  baseSpec({
    id: "n2_002", name: "Pedro Vargas", email: "pedro.vargas@ams.cl",
    role: "N2_FUNCTIONAL_CONSULTANT", team: "SD Squad",
    skills: ["SD", "VA01", "VA02", "VL01N", "pricing", "VK11", "billing", "VF01"],
    sapModules: ["SD"], processes: ["Order to Cash"],
    clients: ["ACME"],
    maxActiveCases: 6, currentActiveCases: 5,
  }),
  baseSpec({
    id: "n2_003", name: "Ana Martínez", email: "ana.martinez@ams.cl",
    role: "N2_ABAP_SPECIALIST", team: "Tech Squad",
    skills: ["ABAP", "BADI", "user-exit", "enhancement", "Z reports", "ST22", "SE80", "debugging"],
    sapModules: ["MM", "SD", "PP"], processes: ["Cross-module"],
    clients: ["ACME", "TechCorp", "GlobalCo"],
    maxActiveCases: 5, currentActiveCases: 2,
  }),
  baseSpec({
    id: "n2_004", name: "Carlos Méndez", email: "carlos.mendez@ams.cl",
    role: "N2_INTEGRATION_SPECIALIST", team: "Integrations Squad",
    skills: ["CPI", "PI", "PO", "IDoc", "WE02", "BD87", "iflow", "OData", "REST", "EWM-ERP", "qRFC"],
    sapModules: ["INTEGRACION"], processes: ["Integrations"],
    clients: ["TechCorp", "GlobalCo"],
    maxActiveCases: 5, currentActiveCases: 4,
  }),
  baseSpec({
    id: "n2_005", name: "Lucía Fernández", email: "lucia.fernandez@ams.cl",
    role: "N2_SERVICE_LEAD", team: "PP Squad",
    skills: ["MRP", "MD01", "MD04", "PP", "production order", "BOM", "routing", "planning"],
    sapModules: ["PP", "MM"], processes: ["Plan to Produce"],
    clients: ["ACME", "Manufactura SA"],
    maxActiveCases: 5, currentActiveCases: 3,
  }),
  baseSpec({
    id: "n2_006", name: "Roberto Silva", email: "roberto.silva@ams.cl",
    role: "N2_TECHNICAL_CONSULTANT", team: "Basis Squad",
    skills: ["Basis", "ST03", "performance", "SM37", "jobs", "indices", "DBA", "ST22", "dump", "PFCG", "authorization"],
    sapModules: ["BASIS"], processes: ["Basis Operations"],
    clients: ["ACME", "TechCorp", "GlobalCo", "Manufactura SA"],
    maxActiveCases: 6, currentActiveCases: 1,
  }),
  baseSpec({
    id: "n2_007", name: "Patricia Rojas", email: "patricia.rojas@ams.cl",
    role: "N2_FUNCTIONAL_CONSULTANT", team: "WM Squad",
    skills: ["WM", "EWM", "LT03", "warehouse task", "/SCWM/", "handling unit", "picking"],
    sapModules: ["WM", "EWM"], processes: ["Warehouse Operations"],
    clients: ["Logística Cl"],
    availabilityStatus: "BUSY",
    maxActiveCases: 5, currentActiveCases: 5,
  }),
  baseSpec({
    id: "n2_008", name: "Diego Torres", email: "diego.torres@ams.cl",
    role: "N2_ARCHITECT", team: "Architecture",
    skills: ["architecture", "QM", "PM", "QA32", "IW21", "cross-module", "design"],
    sapModules: ["QM", "PM", "CROSS"], processes: ["Cross-module"],
    clients: ["GlobalCo"],
    availabilityStatus: "VACATION",
    maxActiveCases: 4, currentActiveCases: 0,
  }),
];

// ============================================================
// Histórico (para scoring del motor)
// ============================================================

export const N2_SPECIALISTS_HISTORY: N2SpecialistHistory[] = [
  { responsibleId: "n2_001", recentCasesCount: 18, avgResolutionHours: 6.5, withinBandPct: 78,
    topModules: ["MM"], strongIssueTypes: ["incident_functional_complex", "master_data_issue", "customizing_issue"],
    customerSatisfactionScore: 88 },
  { responsibleId: "n2_002", recentCasesCount: 22, avgResolutionHours: 4.2, withinBandPct: 71,
    topModules: ["SD"], strongIssueTypes: ["pricing_issue", "incident_functional_simple"],
    customerSatisfactionScore: 91 },
  { responsibleId: "n2_003", recentCasesCount: 10, avgResolutionHours: 14, withinBandPct: 65,
    topModules: ["MM", "SD", "PP"], strongIssueTypes: ["change_with_development", "incident_technical"],
    customerSatisfactionScore: 85 },
  { responsibleId: "n2_004", recentCasesCount: 15, avgResolutionHours: 8, withinBandPct: 73,
    topModules: ["INTEGRACION"], strongIssueTypes: ["idoc_api_issue", "interface_issue", "integration_issue"],
    customerSatisfactionScore: 87 },
  { responsibleId: "n2_005", recentCasesCount: 12, avgResolutionHours: 9.5, withinBandPct: 80,
    topModules: ["PP", "MM"], strongIssueTypes: ["mrp_issue", "customizing_issue"],
    customerSatisfactionScore: 92 },
  { responsibleId: "n2_006", recentCasesCount: 8, avgResolutionHours: 18, withinBandPct: 68,
    topModules: ["BASIS"], strongIssueTypes: ["performance_issue", "job_issue", "authorization_issue"],
    customerSatisfactionScore: 86 },
  { responsibleId: "n2_007", recentCasesCount: 14, avgResolutionHours: 5.8, withinBandPct: 76,
    topModules: ["WM", "EWM"], strongIssueTypes: ["incident_functional_complex", "integration_issue"],
    customerSatisfactionScore: 89 },
  { responsibleId: "n2_008", recentCasesCount: 6, avgResolutionHours: 22, withinBandPct: 75,
    topModules: ["QM", "PM"], strongIssueTypes: ["incident_functional_complex", "customizing_issue"],
    customerSatisfactionScore: 94 },
];

// ============================================================
// Helpers de acceso
// ============================================================

export function getHistoryForResponsible(responsibleId: string): N2SpecialistHistory | null {
  return N2_SPECIALISTS_HISTORY.find((h) => h.responsibleId === responsibleId) ?? null;
}

export function getActiveSpecialists(): N2Responsible[] {
  return N2_SPECIALISTS_MOCK.filter((s) => s.active);
}
