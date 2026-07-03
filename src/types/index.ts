// Tipos compartidos de la plataforma

export type Role = "viewer" | "consultor" | "aprobador" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  created_at: string;
  /**
   * Tenant al que pertenece el usuario.
   * Backend lo expone via /api/auth/me después del session lookup.
   * Opcional con default 'default' para retrocompat con endpoints que aún no lo devuelven.
   */
  tenant_id?: string;
}

export type Environment = "NO_INFORMADO" | "DEV" | "QA" | "PRD" | "SANDBOX";

export type SapModule =
  | "NO_INFORMADO"
  | "MM" | "SD" | "PP" | "WM" | "EWM"
  | "QM" | "PM" | "ARIBA" | "IBP" | "BTP" | "INTEGRACION";

export type ModuleStatus = "available" | "coming_soon" | "restricted";

/** Grupos del sidebar — cada uno tiene un header. Grupos sin items visibles se ocultan.
 *  Reestructura onda 5.2: navegación por flujo de trabajo (inicio → operación
 *  diaria → agentes IA → herramientas → visualizaciones → ejecutivo/sistema). */
export type ModuleGroup =
  | "inicio"
  | "operacion"
  | "agentes"
  | "herramientas"
  | "visualizaciones"
  | "sistema";

export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
  status: ModuleStatus;
  phase: number;
  /** Legacy — fallback si permissionKey no está. Para retrocompat. */
  rolesAllowed: Role[];
  /**
   * Screen RBAC asociada — fuente única de verdad de permisos.
   * Si NO se setea → módulo se oculta por default (fail-closed).
   * El sidebar consulta hasPermission(user, permissionKey, "view").
   */
  permissionKey?: import("./rbac").PlatformScreen;
  /** Grupo donde aparece en el sidebar. Default "herramientas". */
  group?: ModuleGroup;
  /**
   * Si true, el módulo se muestra sin chequeo de permisos (welcome, settings).
   * Use con cuidado — anula fail-closed.
   */
  public?: boolean;
}

export type ConfidenceLevel = "baja" | "media" | "alta" | "no_detectada";

export type AttachmentMime = "image/png" | "image/jpeg" | "image/webp";

export interface Attachment {
  name: string;
  mimeType: AttachmentMime;
  sizeBytes: number;
  dataBase64: string; // sin prefijo data:...;base64,
}

export interface AgentChatRequest {
  message: string;
  user?: string;
  module?: SapModule;
  client?: string;
  environment?: Environment;
  attachments?: Attachment[];
}

export interface AgentResponseSource {
  id: string;
  sourceType: "rag_document" | "kb_article" | "playbook" | "scope_item" | "qa";
  title: string;
  chunkIndex?: number;
  relevance?: number;
}

export interface AgentResponseMetadata {
  model: string;
  timestamp: string;
  confidence: ConfidenceLevel;
  // Trazabilidad agregada por el backend al construir la respuesta
  agentVersion?: string;          // ej. "v0.1.0" o git sha
  kbVersion?: string;             // ej. "KB-2026-05-31-1430-n42"
  mode?: "demo" | "real";         // demo cuando no hay conectores externos
  responseId?: string;             // FK con agent_response_provenance / feedback
  sources?: AgentResponseSource[]; // fuentes RAG / KB / Playbook usadas
}

export interface AgentChatResponseOk {
  success: true;
  agent: string;
  input: {
    message: string;
    user: string;
    module: string;
    client: string;
    environment: string;
  };
  response: string;
  metadata: AgentResponseMetadata;
}

export interface AgentChatResponseError {
  success: false;
  error: string;
}

export type AgentChatResponse = AgentChatResponseOk | AgentChatResponseError;

export interface AttachmentPreview {
  name: string;
  mimeType: AttachmentMime;
  sizeBytes: number;
  // Para preview en el chat usamos dataUrl completo "data:image/...;base64,..."
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  attachments?: AttachmentPreview[];
  metadata?: AgentChatResponseOk["metadata"];
  createdAt: string;
}
