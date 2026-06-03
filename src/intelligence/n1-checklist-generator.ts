// =============================================================================
// N1 Checklist Generator
// =============================================================================
// Genera un checklist accionable para que N1 pueda intentar resolver un ticket
// antes de escalar a N2. Reglas por módulo SAP, con criterios claros de
// resolución vs escalamiento.
//
// Determinístico, sin LLM.
// =============================================================================

import type {
  GuidedTicketDraft, ChecklistN1Item, N1EscalationCriterion,
} from "@/types/guided-ticket-intake";

// ============================================================
// Helpers
// ============================================================

function item(
  id: string, label: string, order: number, opts: Partial<ChecklistN1Item> = {},
): ChecklistN1Item {
  return {
    id,
    label,
    description: opts.description,
    resolvableN1: opts.resolvableN1 ?? true,
    escalateReason: opts.escalateReason,
    order,
    completed: false,
  };
}

// ============================================================
// Checklists por módulo SAP
// ============================================================

function mmChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const sapData = draft.sapData;
  const hasPO = !!sapData.purchase_order;
  const hasMaterial = !!sapData.material;
  const hasMessage = !!sapData.m7_message;

  return [
    item("mm_validate_msg",  "Validar mensaje SAP completo", 1, {
      description: hasMessage ? `Mensaje informado: ${sapData.m7_message?.slice(0, 60)}...` : "Pedir mensaje literal al usuario",
      resolvableN1: true,
    }),
    item("mm_validate_po",   "Validar OC y posición", 2, {
      description: hasPO ? `OC: ${sapData.purchase_order}` : "Pedir número de OC",
      resolvableN1: true,
    }),
    item("mm_validate_mat",  "Validar material en centro", 3, {
      description: hasMaterial && sapData.plant
        ? `Material ${sapData.material} en centro ${sapData.plant}`
        : "Validar maestro de material + extensión al centro",
      resolvableN1: true,
    }),
    item("mm_validate_loc",  "Validar centro/almacén", 4, {
      description: `Centro: ${sapData.plant || "?"} · Almacén: ${sapData.storage_loc || "?"}`,
      resolvableN1: true,
    }),
    item("mm_validate_qty",  "Validar cantidad pendiente de recepción", 5, {
      description: "Comparar cantidad pedida vs ya recibida vs por recibir (ME23N)",
      resolvableN1: true,
    }),
    item("mm_validate_mvt",  "Validar clase de movimiento", 6, {
      description: sapData.movement_type ? `Clase: ${sapData.movement_type}` : "Verificar clase aplicable (101/103/105/561/...)",
      resolvableN1: true,
    }),
    item("mm_check_others",  "Revisar si ocurre en otros documentos", 7, {
      description: "¿Solo con esta OC o con varias? Determina si es dato o customizing",
      resolvableN1: true,
    }),
    item("mm_escalate_cust", "Si apunta a customizing o inconsistencia técnica → escalar N2", 8, {
      resolvableN1: false,
      escalateReason: "Configuración SAP MM requiere acceso de consultor funcional",
    }),
  ];
}

function sdChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const d = draft.sapData;
  return [
    item("sd_validate_msg", "Validar mensaje V1/VF completo", 1, {
      description: d.sd_message?.slice(0, 80) || "Pedir mensaje literal",
    }),
    item("sd_validate_so", "Validar pedido de venta + posiciones", 2, {
      description: d.sales_order ? `Pedido ${d.sales_order}` : "Pedir número de pedido",
    }),
    item("sd_validate_customer", "Validar maestro de cliente + datos crédito", 3, {
      description: d.customer ? `Cliente ${d.customer}` : "Pedir cliente",
    }),
    item("sd_validate_org", "Validar organización ventas / canal / sector", 4, {
      description: `Org: ${d.sales_org || "?"} · Canal: ${d.channel || "?"} · Sector: ${d.division || "?"}`,
    }),
    item("sd_validate_pricing", "Validar condiciones de precio (VK11/VK13)", 5, {
      description: "Verificar que las condiciones aplicables existan y estén vigentes",
    }),
    item("sd_check_others", "Revisar si afecta otros pedidos", 6),
    item("sd_escalate_config", "Si requiere customizing de tipos doc / determinación → N2", 7, {
      resolvableN1: false,
      escalateReason: "Customizing de SD requiere consultor funcional",
    }),
  ];
}

function wmChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const d = draft.sapData;
  return [
    item("wm_validate_msg",  "Validar mensaje WM/EWM completo", 1),
    item("wm_validate_delivery", "Validar entrega de origen/destino", 2, {
      description: d.delivery ? `Entrega ${d.delivery}` : "Pedir entrega",
    }),
    item("wm_validate_loc",  "Validar tipo de almacén + ubicación", 3, {
      description: `Almacén: ${d.warehouse || "?"} · Tipo: ${d.storage_type || "?"} · Bin: ${d.storage_bin || "?"}`,
    }),
    item("wm_validate_hu",   "Validar HU y bloqueos", 4, {
      description: d.handling_unit ? `HU ${d.handling_unit}` : "Verificar si aplica HU",
    }),
    item("wm_validate_to",   "Validar OT/TO y estado", 5, {
      description: d.transfer_order ? `OT ${d.transfer_order}` : "Crear/verificar OT pendiente",
    }),
    item("wm_check_stock",   "Verificar stock disponible en ubicación origen", 6),
    item("wm_escalate_cust", "Si requiere customizing tipo almacén / estrategia búsqueda → N2", 7, {
      resolvableN1: false,
      escalateReason: "Customizing WM/EWM requiere consultor funcional",
    }),
  ];
}

function ppChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const d = draft.sapData;
  return [
    item("pp_validate_msg", "Validar mensaje de planificación completo", 1),
    item("pp_validate_mat", "Validar maestro de material + vistas MRP", 2, {
      description: d.material ? `Material ${d.material}` : "Pedir material",
    }),
    item("pp_validate_plant", "Validar centro + MRP Area", 3, {
      description: `Centro: ${d.plant || "?"} · MRP Area: ${d.mrp_area || "?"}`,
    }),
    item("pp_validate_strategy", "Validar estrategia de planificación", 4, {
      description: d.planning_strategy ? `Estrategia ${d.planning_strategy}` : "Verificar estrategia aplicada",
    }),
    item("pp_validate_order", "Validar orden de fabricación + estado", 5, {
      description: d.production_order ? `Orden ${d.production_order}` : "Verificar si hay órdenes asociadas",
    }),
    item("pp_check_mrp_run", "Verificar última corrida MRP + parámetros", 6, {
      description: d.mrp_run_date ? `Última corrida: ${d.mrp_run_date}` : "Revisar logs de MD01/MD02",
    }),
    item("pp_escalate_routing", "Si requiere ajuste de rutas/recetas o customizing → N2", 7, {
      resolvableN1: false,
      escalateReason: "Routing y customizing PP requieren consultor funcional",
    }),
  ];
}

function integracionChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const d = draft.sapData;
  return [
    item("int_validate_systems", "Confirmar sistema origen y destino", 1, {
      description: `${d.source_system || "?"} → ${d.target_system || "?"}`,
    }),
    item("int_validate_interface", "Validar ID de interfaz / iFlow", 2, {
      description: d.interface_id ? `Interfaz ${d.interface_id}` : "Pedir ID de interfaz al equipo de integración",
    }),
    item("int_check_timestamp", "Revisar logs del timestamp informado", 3, {
      description: d.timestamp ? `TS: ${d.timestamp}` : "Pedir momento exacto del error",
    }),
    item("int_check_retries", "Verificar reintentos automáticos", 4, {
      description: d.retries_done ? `${d.retries_done} reintentos realizados` : "Verificar política de retry",
    }),
    item("int_check_payload", "Validar estructura del payload", 5, {
      description: "Comparar contra schema esperado. Buscar campos faltantes o tipos incorrectos",
    }),
    item("int_escalate_dev", "Si requiere debug ABAP / modificación de iFlow / customizing → N2", 6, {
      resolvableN1: false,
      escalateReason: "Cambios en código de interfaz requieren equipo de integración",
    }),
  ];
}

function defaultChecklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const d = draft.sapData;
  return [
    item("default_validate_msg", "Validar mensaje de error completo", 1, {
      description: d.error_message?.slice(0, 80) || "Pedir mensaje literal",
    }),
    item("default_validate_doc", "Validar documento SAP relacionado", 2, {
      description: d.sap_document || "Pedir número de documento",
    }),
    item("default_validate_master", "Validar datos maestros relevantes", 3),
    item("default_check_kb",  "Buscar caso similar en Knowledge Base", 4),
    item("default_check_others", "Verificar si afecta a otros usuarios / documentos", 5),
    item("default_escalate", "Si no hay playbook ni KB → escalar N2", 6, {
      resolvableN1: false,
      escalateReason: "No existe playbook documentado para este caso",
    }),
  ];
}

// ============================================================
// Reglas de escalamiento N2 (cuándo escalar automáticamente)
// ============================================================

/**
 * Detecta criterios de escalamiento N2 sobre un draft.
 * Devuelve lista vacía si N1 puede resolver sin escalar.
 */
export function detectEscalationCriteria(draft: GuidedTicketDraft): N1EscalationCriterion[] {
  const criteria: N1EscalationCriterion[] = [];
  const ctx = draft.context;
  const prob = draft.problem;

  // Impacto crítico en PRD afectando a todos los usuarios
  if (ctx.environment === "PRD" && prob.affectedUsers === "all") {
    criteria.push("massive_prd_impact");
  }
  // Impacto financiero/logístico crítico (impact level blocks_critical_process en PRD)
  if (ctx.environment === "PRD" && ctx.businessImpact === "blocks_critical_process") {
    criteria.push("financial_or_logistic_critical");
  }
  // Prioridad alta sin transacción ni mensaje detectado → poca confianza
  const hasError = !!prob.errorMessageExact;
  const hasTransaction = !!ctx.transaction;
  if ((ctx.priority === "High" || ctx.priority === "Highest") && (!hasError || !hasTransaction)) {
    criteria.push("low_confidence_high_priority");
  }
  // Si el módulo es DEFAULT (sin spec), probablemente no hay playbook
  if (!ctx.sapModule || ctx.sapModule === "NO_INFORMADO") {
    criteria.push("no_playbook_available");
  }

  return Array.from(new Set(criteria));
}

// ============================================================
// API principal
// ============================================================

/**
 * Genera el checklist N1 según el módulo del draft.
 */
export function generateN1Checklist(draft: GuidedTicketDraft): ChecklistN1Item[] {
  const module = (draft.context.sapModule || "").toUpperCase();
  switch (module) {
    case "MM":          return mmChecklist(draft);
    case "SD":          return sdChecklist(draft);
    case "WM":
    case "EWM":         return wmChecklist(draft);
    case "PP":          return ppChecklist(draft);
    case "INTEGRACION": return integracionChecklist(draft);
    default:            return defaultChecklist(draft);
  }
}

/**
 * ¿N1 puede resolver el ticket dado el draft + checklist?
 * Devuelve true si TODOS los items son resolvableN1 y NO hay criterios de escalamiento.
 */
export function canResolveAtN1(draft: GuidedTicketDraft): boolean {
  const checklist = generateN1Checklist(draft);
  const escalations = detectEscalationCriteria(draft);
  const allItemsResolvable = checklist.every((c) => c.resolvableN1);
  return allItemsResolvable && escalations.length === 0;
}
