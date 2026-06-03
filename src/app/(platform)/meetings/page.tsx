"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { usePlatform } from "@/context/PlatformContext";
import {
  uploadMeeting,
  listMeetings,
  getMeeting,
  deleteMeeting,
  type Meeting,
} from "@/services/meetings.api";
import { useToast } from "@/context/ToastContext";
import { exportMeetingMarkdown } from "@/lib/export";
import RequirePermission from "@/components/admin/RequirePermission";

const ALLOWED_MIME = new Set<string>([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/x-m4a",
]);
const MAX_BYTES = 25 * 1024 * 1024;

function fmtSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function fmtSec(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function statusBadge(s: Meeting["status"]) {
  if (s === "done") return <Badge variant="ok">listo</Badge>;
  if (s === "error") return <Badge variant="error">error</Badge>;
  if (s === "transcribing") return <Badge variant="warn">transcribiendo…</Badge>;
  if (s === "extracting") return <Badge variant="warn">extrayendo…</Badge>;
  return <Badge variant="info">en cola</Badge>;
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === "string" ? r.result : "";
      const c = s.indexOf(",");
      resolve(c >= 0 ? s.slice(c + 1) : s);
    };
    r.onerror = () => reject(r.error ?? new Error("read error"));
    r.readAsDataURL(file);
  });
}

const PRIORITY_VARIANT: Record<string, "ok" | "warn" | "error" | "muted"> = {
  alta: "error", media: "warn", baja: "ok",
};

function MeetingsPageInner() {
  const { client } = usePlatform();
  const toast = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("es");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Meeting | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMeetings();
    if ("success" in res && res.success) setMeetings(res.meetings);
    else                                  setError("error" in res ? res.error : "Error");
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh mientras haya procesos pendientes
  useEffect(() => {
    const inFlight = meetings.some((m) => m.status !== "done" && m.status !== "error");
    if (!inFlight) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [meetings, refresh]);

  // Cargar detalle
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    getMeeting(selectedId).then((r) => {
      if (cancelled) return;
      if ("success" in r && r.success) setDetail(r.meeting);
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Si el detail está pending, refrescarlo
  useEffect(() => {
    if (!detail) return;
    if (detail.status === "done" || detail.status === "error") return;
    const id = setInterval(async () => {
      const r = await getMeeting(detail.id);
      if ("success" in r && r.success) setDetail(r.meeting);
    }, 5000);
    return () => clearInterval(id);
  }, [detail?.id, detail?.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file: File) {
    setUploadError(null);
    if (!ALLOWED_MIME.has(file.type)) {
      setUploadError(`"${file.name}": formato no soportado (${file.type || "desconocido"}). Acepta mp3, wav, m4a, webm, ogg.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(`"${file.name}" supera ${MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    if (!title.trim()) {
      setUploadError("Pon un título a la reunión antes de subir.");
      return;
    }
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await uploadMeeting({
        title: title.trim(),
        client: client || undefined,
        fileName: file.name,
        mimeType: file.type,
        dataBase64: b64,
        language,
      });
      if ("success" in res && res.success) {
        if (inputRef.current) inputRef.current.value = "";
        setTitle("");
        refresh();
        setSelectedId(res.meeting.id);
        toast.success("Audio recibido. Procesando en background…");
      } else {
        const msg = "error" in res ? res.error : "Error desconocido";
        setUploadError(msg);
        toast.error(msg);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(m: Meeting) {
    if (!confirm(`¿Eliminar "${m.title}"?`)) return;
    const r = await deleteMeeting(m.id);
    if ("success" in r && r.success) {
      if (selectedId === m.id) setSelectedId(null);
      refresh();
      toast.success("Reunión eliminada");
    } else {
      const msg = "error" in r ? r.error : "?";
      toast.error("No pude borrar: " + msg);
    }
  }

  function handleExport(m: Meeting) {
    try {
      exportMeetingMarkdown(m);
      toast.success(`Minuta exportada como .md`);
    } catch (e) {
      toast.error("No pude exportar: " + (e instanceof Error ? e.message : "?"));
    }
  }

  return (
    <div>
      <div className="page-title">
        <h1>🎙️ Reuniones AMS</h1>
        <p>
          Sube un audio de reunión (mp3/wav/m4a/webm/ogg). Whisper transcribe localmente sin enviar el audio a servicios externos pagos, y Gemini extrae minuta estructurada con acciones AMS.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Subir audio</h3>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lab">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Daily AMS Demo · 2026-05-25" />
          </div>
          <div style={{ width: 140 }}>
            <label className="lab">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="pt">Portugués</option>
            </select>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={uploading}
            style={{ display: "none" }}
            id="meet-input"
          />
          <label htmlFor="meet-input" className="btn primary" style={{ cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? <><span className="spinner" /> Subiendo…</> : "🎤 Elegir audio"}
          </label>
        </div>
        {uploadError && <div className="alert error" style={{ marginTop: 10 }}>{uploadError}</div>}
        <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 10 }}>
          Modelo Whisper: <code>base</code>. Para audios largos puede tardar varios minutos. Máx {MAX_BYTES / (1024 * 1024)} MB.
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
        {/* Lista */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {loading ? "Cargando…" : `${meetings.length} reuni${meetings.length === 1 ? "ón" : "ones"}`}
          </div>
          <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
            {meetings.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>
                Aún no has subido ninguna reunión.
              </div>
            )}
            {meetings.map((m) => {
              const active = selectedId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", padding: "10px 14px", cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div className="row between" style={{ gap: 6, marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {m.title}
                    </div>
                    {statusBadge(m.status)}
                  </div>
                  <div className="row" style={{ gap: 8, fontSize: 11, color: "var(--text-dim)" }}>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                    <span>· {fmtSec(m.duration_sec)}</span>
                    <span>· {fmtSize(m.size_bytes)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle */}
        <div className="card">
          {!selectedId && (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Selecciona una reunión para ver la minuta y la transcripción.
            </div>
          )}
          {selectedId && detailLoading && !detail && <div><span className="spinner" /> cargando…</div>}
          {detail && (
            <div className="col" style={{ gap: 14 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{detail.title}</h3>
                  <div className="row" style={{ gap: 8, marginTop: 4, fontSize: 12, color: "var(--text-soft)" }}>
                    <span>{new Date(detail.created_at).toLocaleString()}</span>
                    {detail.duration_sec && <span>· {fmtSec(detail.duration_sec)}</span>}
                    {detail.client && <span>· cliente {detail.client}</span>}
                    {statusBadge(detail.status)}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {detail.status === "done" && (
                    <button className="btn" onClick={() => handleExport(detail)}>📥 Exportar minuta (.md)</button>
                  )}
                  <button className="btn danger" onClick={() => handleDelete(detail)}>🗑 Eliminar</button>
                </div>
              </div>

              {detail.error_message && (
                <div className="alert error">
                  <b>Error:</b> {detail.error_message}
                </div>
              )}

              {detail.status !== "done" && detail.status !== "error" && (
                <div className="alert info"><span className="spinner" /> Procesando — esta vista se actualiza sola.</div>
              )}

              {detail.summary && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Resumen ejecutivo</h4>
                  <div className="msg agent" style={{ marginTop: 0 }}>
                    <div className="body"><MarkdownView text={detail.summary} /></div>
                  </div>
                </div>
              )}

              {detail.minute?.attendees && detail.minute.attendees.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Asistentes detectados</h4>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {detail.minute.attendees.map((a, i) => <Badge key={i} variant="muted">{a}</Badge>)}
                  </div>
                </div>
              )}

              {detail.minute?.actions && detail.minute.actions.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Acciones AMS</h4>
                  <div className="col" style={{ gap: 8 }}>
                    {detail.minute.actions.map((a, i) => (
                      <div key={i} className="card" style={{ padding: 10 }}>
                        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                          <Badge variant={PRIORITY_VARIANT[(a.priority || "").toLowerCase()] ?? "muted"}>
                            {a.priority || "—"}
                          </Badge>
                          {a.context_sap && <Badge variant="tech">{a.context_sap}</Badge>}
                        </div>
                        <div style={{ fontSize: 13.5 }}>{a.action}</div>
                        <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>
                          <b>Owner:</b> {a.owner || "sin asignar"} · <b>Vence:</b> {a.due || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.minute?.decisions && detail.minute.decisions.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Decisiones</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {detail.minute.decisions.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}

              {detail.minute?.risks && detail.minute.risks.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-soft)" }}>Riesgos</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--warn)" }}>
                    {detail.minute.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {detail.transcript && (
                <details>
                  <summary style={{ cursor: "pointer", color: "var(--text-soft)", fontSize: 13 }}>
                    Ver transcripción completa
                  </summary>
                  <div className="msg agent" style={{ marginTop: 8, maxHeight: 320, overflow: "auto" }}>
                    <div className="body" style={{ whiteSpace: "pre-wrap" }}>{detail.transcript}</div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function MeetingsPage() {
  return (
    <RequirePermission screen="servicios" action="view">
      <MeetingsPageInner />
    </RequirePermission>
  );
}
