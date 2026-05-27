// Tipos compartidos de la plataforma

export type Role = "viewer" | "consultor" | "aprobador" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  created_at: string;
}

export type Environment = "NO_INFORMADO" | "DEV" | "QA" | "PRD" | "SANDBOX";

export type SapModule =
  | "NO_INFORMADO"
  | "MM" | "SD" | "PP" | "WM" | "EWM"
  | "QM" | "PM" | "ARIBA" | "IBP" | "BTP" | "INTEGRACION";

export type ModuleStatus = "available" | "coming_soon" | "restricted";

export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
  status: ModuleStatus;
  phase: number;
  rolesAllowed: Role[];
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
  metadata: {
    model: string;
    timestamp: string;
    confidence: ConfidenceLevel;
  };
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
