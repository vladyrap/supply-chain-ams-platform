// Sistema RBAC nuevo, frontend-only con localStorage.
// Convive con el Role legacy ("viewer" | "consultor" | "aprobador" | "admin")
// que sigue vigente para el AuthContext y el rolesAllowed de cada módulo.
//
// Mapeo de equivalencia legacy → roleCode RBAC:
//   viewer    → GENERAL_USER
//   consultor → AMS_CONSULTANT
//   aprobador → SERVICE_LEAD
//   admin     → ADMIN

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "configure"
  | "approve";

export type PlatformScreen =
  | "dashboard"
  | "agente_ams"
  | "incidentes"
  | "modulos_sap"
  | "servicios"
  | "reportes"
  | "auditoria"
  | "administracion"
  | "configuracion"
  | "canal_telefonico"
  | "conocimiento_rag"
  | "integraciones"
  | "usuarios"
  | "roles"
  | "entrenamiento_ia"
  | "playbooks_ams"
  | "document_factory"
  | "quality_evaluator"
  | "escalamiento_n2"
  | "testing_intelligence";

export interface RolePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  configure: boolean;
  approve: boolean;
}

export type RolePermissionMap = Record<PlatformScreen, RolePermission>;

export interface PlatformRole {
  id: string;
  name: string;
  code: string;          // UPPER_SNAKE_CASE
  description: string;
  isSystem: boolean;     // los del seed; protección de borrado
  permissions: RolePermissionMap;
  createdAt: string;
  updatedAt: string;
}

export type ServiceLevel = "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  roleCode: string;      // FK con PlatformRole.code
  serviceLevel: ServiceLevel;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

// Etiquetas legibles para las pantallas (UI)
export const SCREEN_LABELS: Record<PlatformScreen, string> = {
  dashboard:        "Dashboard",
  agente_ams:       "Agente AMS",
  incidentes:       "Incidentes",
  modulos_sap:      "Módulos SAP",
  servicios:        "Servicios",
  reportes:         "Reportes",
  auditoria:        "Auditoría",
  administracion:   "Administración",
  configuracion:    "Configuración",
  canal_telefonico: "Canal Telefónico",
  conocimiento_rag: "Conocimiento RAG",
  integraciones:    "Integraciones",
  usuarios:         "Usuarios",
  roles:            "Roles",
  entrenamiento_ia: "Entrenamiento IA",
  playbooks_ams:    "Playbooks AMS",
  document_factory: "Document Factory",
  quality_evaluator:"Quality Evaluator",
  escalamiento_n2:  "Escalamiento N2",
  testing_intelligence: "Testing Intelligence",
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view:      "Ver",
  create:    "Crear",
  edit:      "Editar",
  delete:    "Eliminar",
  export:    "Exportar",
  configure: "Configurar",
  approve:   "Aprobar",
};

export const ALL_SCREENS: PlatformScreen[] = [
  "dashboard", "agente_ams", "incidentes", "modulos_sap", "servicios",
  "reportes", "auditoria", "administracion", "configuracion",
  "canal_telefonico", "conocimiento_rag", "integraciones",
  "usuarios", "roles", "entrenamiento_ia",
  "playbooks_ams", "document_factory", "quality_evaluator",
  "escalamiento_n2", "testing_intelligence",
];

export const ALL_ACTIONS: PermissionAction[] = [
  "view", "create", "edit", "delete", "export", "configure", "approve",
];

export const SERVICE_LEVELS: ServiceLevel[] = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"];

// Storage keys
export const RBAC_STORAGE = {
  roles:        "supply-chain-ams-platform-roles",
  users:        "supply-chain-ams-platform-users",
  currentUser:  "supply-chain-ams-platform-current-user",
} as const;
