// Cliente para el módulo Canal Telefónico IA del agente.
// Backend: backend/src/routes/voice.routes.ts
//   GET  /api/voice/calls?limit=N
//   GET  /api/voice/calls/:callSid

import { apiGet, ApiError } from "./_http";

export type CallSpeaker = "USER" | "AI" | "SYSTEM";

export interface VoiceCall {
  id: string;
  call_sid: string;
  from_number: string | null;       // ya viene enmascarado del backend
  to_number: string | null;
  call_status: string | null;       // ringing | in-progress | completed | busy | failed | no-answer | canceled
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  ai_responses: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VoiceTurn {
  id: string;
  call_sid: string;
  speaker: CallSpeaker;
  message: string;
  created_at: string;
}

export async function listVoiceCalls(limit = 100): Promise<
  | { ok: true; count: number; calls: VoiceCall[] }
  | { ok: false; error: string }
> {
  try {
    const data = await apiGet<{ success: boolean; count?: number; calls?: VoiceCall[]; error?: string }>(
      `/api/voice/calls?limit=${limit}`,
    );
    if (!data || !data.success || !data.calls) {
      return { ok: false, error: data?.error || "no data" };
    }
    return { ok: true, count: data.count ?? data.calls.length, calls: data.calls };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function getVoiceCall(callSid: string): Promise<
  | { ok: true; call: VoiceCall; turns: VoiceTurn[] }
  | { ok: false; error: string }
> {
  try {
    const data = await apiGet<{ success: boolean; call?: VoiceCall; turns?: VoiceTurn[]; error?: string }>(
      `/api/voice/calls/${encodeURIComponent(callSid)}`,
    );
    if (!data || !data.success || !data.call) {
      return { ok: false, error: data?.error || "no data" };
    }
    return { ok: true, call: data.call, turns: data.turns ?? [] };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
