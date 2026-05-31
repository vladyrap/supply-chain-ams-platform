// Engine de valor económico AMS.
// Convierte la actividad operativa del sistema (tickets, RCAs, minutas,
// casos de prueba, conversiones a KB, escalamientos evitados) en métricas
// de horas ahorradas y costo evitado.
//
// Reglas demo según spec — calibradas manualmente. Para producción real
// debería alimentarse de baselines históricos por cliente y por módulo.

const HOURLY_COST_USD = Number(process.env.NEXT_PUBLIC_AMS_HOURLY_COST_USD || 60);

export interface BusinessValueInput {
  // Cantidades por categoría
  ticketsAssistedByIa: number;
  rcasGenerated: number;
  meetingMinutesGenerated: number;
  testCasesGenerated: number;
  knowledgeConversions: number;
  avoidedEscalations: number;
  documentsGenerated: number;
  // Configuración opcional
  hourlyCostUsd?: number;
}

export interface BusinessValueResult {
  hourlyCostUsd: number;
  hoursSaved: { min: number; max: number };
  costAvoidedUsd: { min: number; max: number };
  breakdown: Array<{
    category: string;
    count: number;
    minHoursEach: number;
    maxHoursEach: number;
    minHoursTotal: number;
    maxHoursTotal: number;
  }>;
  totals: {
    minHours: number;
    maxHours: number;
    minCost: number;
    maxCost: number;
  };
}

const RULES: Array<{
  key: keyof Omit<BusinessValueInput, "hourlyCostUsd">;
  category: string;
  minEach: number;
  maxEach: number;
}> = [
  { key: "ticketsAssistedByIa",      category: "Tickets asistidos por IA",        minEach: 0.5, maxEach: 2 },
  { key: "rcasGenerated",            category: "RCAs generados",                  minEach: 2,   maxEach: 4 },
  { key: "meetingMinutesGenerated",  category: "Minutas de reunión",              minEach: 0.5, maxEach: 1 },
  { key: "testCasesGenerated",       category: "Casos de prueba",                 minEach: 1,   maxEach: 3 },
  { key: "knowledgeConversions",     category: "Tickets convertidos a KB",        minEach: 0.5, maxEach: 1.5 },
  { key: "avoidedEscalations",       category: "Escalamientos evitados",          minEach: 2,   maxEach: 6 },
  { key: "documentsGenerated",       category: "Documentos generados (factory)",  minEach: 0.5, maxEach: 2 },
];

export function calculateBusinessValue(input: BusinessValueInput): BusinessValueResult {
  const hourly = input.hourlyCostUsd ?? HOURLY_COST_USD;
  const breakdown = RULES.map((r) => {
    const count = Number(input[r.key] || 0);
    return {
      category: r.category,
      count,
      minHoursEach: r.minEach,
      maxHoursEach: r.maxEach,
      minHoursTotal: +(count * r.minEach).toFixed(1),
      maxHoursTotal: +(count * r.maxEach).toFixed(1),
    };
  });
  const minHours = +breakdown.reduce((s, b) => s + b.minHoursTotal, 0).toFixed(1);
  const maxHours = +breakdown.reduce((s, b) => s + b.maxHoursTotal, 0).toFixed(1);
  const minCost = +(minHours * hourly).toFixed(0);
  const maxCost = +(maxHours * hourly).toFixed(0);
  return {
    hourlyCostUsd: hourly,
    hoursSaved: { min: minHours, max: maxHours },
    costAvoidedUsd: { min: minCost, max: maxCost },
    breakdown,
    totals: { minHours, maxHours, minCost, maxCost },
  };
}

// Helpers individuales (la spec los pide nominados explícitamente)
export const calculateEstimatedHoursSaved = (input: BusinessValueInput) => calculateBusinessValue(input).hoursSaved;
export const calculateAvoidedEscalations  = (input: BusinessValueInput) => input.avoidedEscalations;
export const calculateDocumentationSavings = (input: BusinessValueInput) => {
  const r = calculateBusinessValue(input);
  return r.breakdown.find((b) => b.category.startsWith("Documentos"))!;
};
export const calculateKnowledgeReuseValue = (input: BusinessValueInput) => {
  const r = calculateBusinessValue(input);
  return r.breakdown.find((b) => b.category.startsWith("Tickets convertidos"))!;
};
export const calculateEstimatedCostAvoided = (input: BusinessValueInput) => calculateBusinessValue(input).costAvoidedUsd;
