// =============================================================================
// SAP Intake Fields — Catálogo de campos sugeridos por módulo SAP
// =============================================================================
// Usado por el wizard Guided Ticket Intake (paso 3) para mostrar los campos
// que más comunmente necesita N1 para resolver tickets de cada módulo.
//
// El usuario puede llenar todos / algunos / ninguno. Los campos required:true
// pesan en el Readiness Score. Los opcionales suman puntos extra.
//
// Cualquier módulo no listado cae al spec DEFAULT.
// =============================================================================

import type { SapModuleIntakeSpec } from "@/types/guided-ticket-intake";

const MM: SapModuleIntakeSpec = {
  module: "MM",
  label: "Materials Management",
  processes: [
    { id: "goods_receipt",      label: "Recepción de mercancía" },
    { id: "purchase_order",     label: "Orden de compra" },
    { id: "invoice_verification", label: "Verificación de factura (MIRO)" },
    { id: "material_master",    label: "Maestro de materiales" },
    { id: "inventory",          label: "Inventario / consulta stock" },
    { id: "movements",          label: "Movimientos de stock" },
    { id: "other_mm",           label: "Otro" },
  ],
  fields: [
    { id: "purchase_order", label: "Orden de compra (OC)", type: "text",
      placeholder: "4500012345", required: true, hint: "Número de OC SAP (10 dígitos típicamente)" },
    { id: "material",       label: "Material",             type: "text",
      placeholder: "MAT-001", required: true },
    { id: "plant",          label: "Centro",               type: "text",
      placeholder: "1100", required: true, hint: "Código de centro (4 caracteres)" },
    { id: "storage_loc",    label: "Almacén",              type: "text",
      placeholder: "0001" },
    { id: "vendor",         label: "Proveedor",            type: "text",
      placeholder: "VEND-001" },
    { id: "movement_type",  label: "Clase de movimiento",  type: "text",
      placeholder: "101 / 102 / 561 / ...", hint: "Tipo de movimiento de stock" },
    { id: "material_doc",   label: "Documento material (si ya generado)", type: "text",
      placeholder: "5000001234" },
    { id: "m7_message",     label: "Mensaje M7 completo",  type: "textarea",
      placeholder: "M7 022: Determinación de stock especial no posible...",
      required: true, hint: "Copiar literal del mensaje del error" },
  ],
};

const SD: SapModuleIntakeSpec = {
  module: "SD",
  label: "Sales & Distribution",
  processes: [
    { id: "sales_order",       label: "Pedido de venta (VA01/02/03)" },
    { id: "delivery",          label: "Entrega (VL01N)" },
    { id: "billing",           label: "Facturación (VF01)" },
    { id: "pricing",           label: "Determinación de precios" },
    { id: "credit_management", label: "Gestión de crédito" },
    { id: "other_sd",          label: "Otro" },
  ],
  fields: [
    { id: "sales_order",  label: "Pedido de venta", type: "text",
      placeholder: "10000123", required: true },
    { id: "delivery",     label: "Entrega",          type: "text",
      placeholder: "80000456" },
    { id: "invoice",      label: "Factura",          type: "text",
      placeholder: "90000789" },
    { id: "customer",     label: "Cliente",          type: "text",
      placeholder: "CUST-12345", required: true },
    { id: "material",     label: "Material",         type: "text",
      placeholder: "FERT-001" },
    { id: "sales_org",    label: "Organización de ventas", type: "text",
      placeholder: "1000", required: true },
    { id: "channel",      label: "Canal de distribución",  type: "text",
      placeholder: "10" },
    { id: "division",     label: "Sector",                 type: "text",
      placeholder: "00" },
    { id: "pricing_cond", label: "Condición de precio",    type: "text",
      placeholder: "PR00 / K007 / ..." },
    { id: "sd_message",   label: "Mensaje V1/VF completo", type: "textarea",
      required: true, hint: "Mensaje literal del error" },
  ],
};

const WM: SapModuleIntakeSpec = {
  module: "WM",
  label: "Warehouse Management",
  processes: [
    { id: "outbound", label: "Salida (LT03)" },
    { id: "inbound",  label: "Entrada (LT06)" },
    { id: "transfer", label: "Traslado" },
    { id: "inventory", label: "Inventario" },
    { id: "other_wm", label: "Otro" },
  ],
  fields: [
    { id: "delivery",       label: "Entrega",          type: "text", required: true },
    { id: "warehouse",      label: "Almacén",          type: "text",
      placeholder: "010", required: true },
    { id: "storage_type",   label: "Tipo de almacén",  type: "text",
      placeholder: "001 / 002 / 003" },
    { id: "storage_bin",    label: "Ubicación (bin)",  type: "text",
      placeholder: "01-01-01" },
    { id: "handling_unit",  label: "HU (si aplica)",   type: "text",
      placeholder: "100023456" },
    { id: "transfer_order", label: "OT / TO (si aplica)", type: "text",
      placeholder: "10000567" },
    { id: "wm_message",     label: "Mensaje WM completo", type: "textarea",
      required: true },
  ],
};

const EWM: SapModuleIntakeSpec = {
  ...WM,
  module: "EWM",
  label: "Extended Warehouse Management",
};

const PP: SapModuleIntakeSpec = {
  module: "PP",
  label: "Production Planning / MRP",
  processes: [
    { id: "mrp",               label: "Corrida MRP (MD01/MD02)" },
    { id: "production_order",  label: "Orden de fabricación (CO01/02/03)" },
    { id: "planning",          label: "Planificación" },
    { id: "confirmation",      label: "Confirmación de operación" },
    { id: "other_pp",          label: "Otro" },
  ],
  fields: [
    { id: "material",         label: "Material",                type: "text", required: true },
    { id: "plant",            label: "Centro",                  type: "text",
      placeholder: "1100", required: true },
    { id: "production_order", label: "Orden de fabricación",    type: "text",
      placeholder: "1000023456" },
    { id: "mrp_area",         label: "MRP Area",                type: "text" },
    { id: "planning_strategy", label: "Estrategia de planificación", type: "text",
      placeholder: "10 / 20 / 40" },
    { id: "mrp_run_date",     label: "Fecha de corrida MRP",    type: "date" },
    { id: "pp_message",       label: "Mensaje de planificación", type: "textarea",
      required: true },
  ],
};

const INTEGRACION: SapModuleIntakeSpec = {
  module: "INTEGRACION",
  label: "Integraciones (CPI / PI/PO / IDoc / OData)",
  processes: [
    { id: "idoc",        label: "IDoc" },
    { id: "odata",       label: "OData" },
    { id: "cpi_iflow",   label: "CPI / iFlow" },
    { id: "pi_po",       label: "PI/PO" },
    { id: "rest_soap",   label: "REST / SOAP custom" },
    { id: "other_int",   label: "Otro" },
  ],
  fields: [
    { id: "source_system",      label: "Sistema origen",      type: "text", required: true,
      placeholder: "S/4HANA PRD / Salesforce / WMS externo" },
    { id: "target_system",      label: "Sistema destino",     type: "text", required: true,
      placeholder: "PI/PO / CPI / Logística externa" },
    { id: "interface_id",       label: "ID de interfaz",      type: "text",
      placeholder: "IF_ORDERS_001 / iFlow_xxx" },
    { id: "timestamp",          label: "Timestamp del error", type: "text",
      placeholder: "2026-06-02T14:30:22Z" },
    { id: "payload",            label: "Payload (recortado, sin secretos)", type: "textarea",
      hint: "Sólo si es seguro compartirlo. NO incluir tokens ni passwords." },
    { id: "integration_error",  label: "Mensaje de error",    type: "textarea", required: true },
    { id: "retries_done",       label: "Reintentos realizados", type: "number",
      placeholder: "0" },
  ],
};

const DEFAULT: SapModuleIntakeSpec = {
  module: "DEFAULT",
  label: "Otro módulo SAP",
  processes: [
    { id: "general", label: "General" },
  ],
  fields: [
    { id: "sap_document",     label: "Documento SAP relacionado", type: "text",
      placeholder: "Nº de documento / pedido / orden" },
    { id: "error_message",    label: "Mensaje de error",   type: "textarea", required: true },
    { id: "master_data",      label: "Datos maestros relevantes", type: "textarea",
      hint: "Materiales, clientes, usuarios, etc." },
  ],
};

// ============================================================
// Lookup
// ============================================================

const REGISTRY: Record<string, SapModuleIntakeSpec> = {
  MM, SD, WM, EWM, PP, INTEGRACION, DEFAULT,
};

/** Devuelve el spec para un módulo. Cae a DEFAULT si no existe. */
export function getSapIntakeSpec(module: string | null | undefined): SapModuleIntakeSpec {
  if (!module) return DEFAULT;
  const key = module.toUpperCase();
  return REGISTRY[key] ?? DEFAULT;
}

/** Lista de módulos con spec dedicado (para selector). */
export const SAP_MODULES_WITH_SPEC = ["MM", "SD", "WM", "EWM", "PP", "INTEGRACION"] as const;
