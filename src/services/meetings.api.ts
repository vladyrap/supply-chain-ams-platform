import { apiFetch, ApiError, type ApiFetchOptions } from "./_http";

export interface MeetingMinute {
  summary?: string;
  topics?: string[];
  decisions?: string[];
  actions?: { action: string; owner?: string; due?: string; priority?: string; context_sap?: string }[];
  risks?: string[];
  follow_ups?: string[];
  attendees?: string[];
}

export interface Meeting {
  id: string;
  title: string;
  client: string | null;
  status: "pending" | "transcribing" | "extracting" | "done" | "error";
  error_message: string | null;
  duration_sec: number | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  transcript: string | null;
  summary: string | null;
  minute: MeetingMinute;
  actions_text: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface UploadMeetingPayload {
  title: string;
  client?: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  language?: string;
}

async function call<T>(path: string, opts: ApiFetchOptions = {}): Promise<T | { success: false; error: string }> {
  try {
    const data = await apiFetch<T>(path, opts);
    if (data === null || data === undefined) return { success: false, error: "no data" } as { success: false; error: string };
    return data;
  } catch (err) {
    if (err instanceof ApiError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "error de red" };
  }
}

export async function uploadMeeting(p: UploadMeetingPayload) {
  return call<{ success: true; meeting: Meeting } | { success: false; error: string }>(
    "/api/meetings/upload",
    { method: "POST", body: p },
  );
}

export async function listMeetings() {
  return call<{ success: true; count: number; meetings: Meeting[] } | { success: false; error: string }>(
    "/api/meetings",
  );
}

export async function getMeeting(id: string) {
  return call<{ success: true; meeting: Meeting } | { success: false; error: string }>(
    `/api/meetings/${id}`,
  );
}

export async function deleteMeeting(id: string) {
  return call<{ success: true } | { success: false; error: string }>(
    `/api/meetings/${id}`,
    { method: "DELETE" },
  );
}
