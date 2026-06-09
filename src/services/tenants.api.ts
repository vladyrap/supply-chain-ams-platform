// =============================================================================
// tenants.api.ts — Cliente API para /api/tenants (v1.2.0)
// =============================================================================

import { apiGet, apiPost, apiPatch, apiDelete } from "./_http";

export type TenantPlan = "starter" | "standard" | "premium" | "enterprise";
export type TenantStatus = "active" | "trial" | "suspended" | "deleted";

export interface TenantBrand {
  logo?: string;
  accent?: string;
  name?: string;
}

export interface TenantSettings {
  timezone?: string;
  locale?: string;
  currency?: string;
  signature?: string;
  [k: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  brand: TenantBrand;
  settings: TenantSettings;
  monthlyQuotaTickets: number | null;
  monthlyQuotaGeminiUsd: number | null;
  createdAt: string;
  updatedAt: string;
  trialEndsAt: string | null;
}

export interface CreateTenantInput {
  id: string;
  name: string;
  subdomain?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  brand?: TenantBrand;
  settings?: TenantSettings;
  monthlyQuotaTickets?: number;
  monthlyQuotaGeminiUsd?: number;
  trialEndsAt?: string;
}

export interface UpdateTenantInput {
  name?: string;
  subdomain?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  brand?: TenantBrand;
  settings?: TenantSettings;
  monthlyQuotaTickets?: number | null;
  monthlyQuotaGeminiUsd?: number | null;
  trialEndsAt?: string | null;
}

/** Tenant del usuario actual (cualquier user autenticado). */
export async function getMyTenant(): Promise<Tenant> {
  const res = await apiGet<{ success: boolean; tenant: Tenant }>("/api/tenants/me");
  return res.tenant;
}

/** Lista todos los tenants (super_admin only). */
export async function listTenants(includeDeleted = false): Promise<Tenant[]> {
  const q = includeDeleted ? "?includeDeleted=true" : "";
  const res = await apiGet<{ success: boolean; tenants: Tenant[] }>(`/api/tenants${q}`);
  return res.tenants;
}

/** Detalle de un tenant. */
export async function getTenant(id: string): Promise<Tenant> {
  const res = await apiGet<{ success: boolean; tenant: Tenant }>(`/api/tenants/${id}`);
  return res.tenant;
}

/** Crear tenant nuevo (super_admin). */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const res = await apiPost<{ success: boolean; tenant: Tenant }>("/api/tenants", input);
  return res.tenant;
}

/** Update parcial (super_admin O admin del tenant para brand/settings/name). */
export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const res = await apiPatch<{ success: boolean; tenant: Tenant }>(`/api/tenants/${id}`, input);
  return res.tenant;
}

/** Update solo del brand (atajo común). */
export async function updateTenantBrand(id: string, brand: TenantBrand): Promise<Tenant> {
  return updateTenant(id, { brand });
}

/** Soft delete (super_admin). */
export async function deleteTenant(id: string): Promise<void> {
  await apiDelete(`/api/tenants/${id}`);
}
