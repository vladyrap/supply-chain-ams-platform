// Cliente del refactor IA (ROCCO) de Clean Core.
// POST /api/clean-core/refactor → { refactored, model }.

import { apiFetch, ApiError } from "./_http";

export async function refactorAbapWithAI(
  code: string,
  model?: string,
): Promise<{ ok: true; refactored: string; model: string } | { ok: false; error: string }> {
  try {
    const data = await apiFetch<{ success: boolean; refactored?: string; model?: string; error?: string }>(
      "/api/clean-core/refactor",
      { method: "POST", body: { code, model } },
    );
    if (!data || !data.success || !data.refactored) {
      return { ok: false, error: data?.error || "respuesta inválida del backend" };
    }
    return { ok: true, refactored: data.refactored, model: data.model || model || "" };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? `Error de red: ${err.message}` : "error de red" };
  }
}
