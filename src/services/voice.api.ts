// Cliente para el módulo Canal Telefónico IA del agente.
// Backend: backend/src/routes/voice.routes.ts
//   GET  /api/voice/calls?limit=N
//   GET  /api/voice/calls/:callSid

const API_BASE =
  (process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:6601").replace(/\/+$/, "");

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
    const res = await fetch(`${API_BASE}/api/voice/calls?limit=${limit}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { success: boolean; count?: number; calls?: VoiceCall[]; error?: string }
      | null;
    if (!data || !data.success || !data.calls) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, count: data.count ?? data.calls.length, calls: data.calls };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function getVoiceCall(callSid: string): Promise<
  | { ok: true; call: VoiceCall; turns: VoiceTurn[] }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE}/api/voice/calls/${encodeURIComponent(callSid)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { success: boolean; call?: VoiceCall; turns?: VoiceTurn[]; error?: string }
      | null;
    if (!data || !data.success || !data.call) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, call: data.call, turns: data.turns ?? [] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "error de red" };
  }
}
