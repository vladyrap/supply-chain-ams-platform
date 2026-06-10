// =============================================================================
// admin-users.api.ts — v1.2.8-prod
// Wrapper para POST /api/admin/users/invite (crear cuenta + email)
// =============================================================================

import { apiFetch, ApiError } from "./_http";

export interface InviteUserInput {
  name: string;
  email: string;
  roleCode: string;
  serviceLevel?: "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";
}

export interface InviteUserResponse {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
    roleCode: string;
    serviceLevel: string;
    status: string;
    createdAt: string;
  };
  emailSent: boolean;
  message: string;
}

export interface InviteUserError {
  success: false;
  error: string;
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<InviteUserResponse | InviteUserError> {
  try {
    const data = await apiFetch<InviteUserResponse>("/api/admin/users/invite", {
      method: "POST",
      body: input,
    });
    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red",
    };
  }
}
