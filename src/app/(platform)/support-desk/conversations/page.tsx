"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import MarkdownView from "@/components/agent/MarkdownView";
import { supportApi, type SupportConversation, type SupportMessage, type SupportStatus } from "@/services/support.api";

function statusVariant(s: SupportStatus): "ok" | "warn" | "error" | "info" | "muted" {
  switch (s) {
    case "open":          return "info";
    case "ai_handling":   return "info";
    case "waiting_user":  return "warn";
    case "escalated":     return "warn";
    case "resolved":      return "ok";
    case "closed":        return "muted";
  }
}

export default function ConversationsPage() {
  const [list, setList] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ conv: SupportConversation; messages: SupportMessage[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await supportApi.listConversations(
      statusFilter !== "all" ? { status: statusFilter } : undefined
    );
    if ("success" in r && r.success) setList(r.conversations);
    else setError("error" in r ? r.error : "Error");
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    supportApi.getConversation(selectedId).then((r) => {
      if (cancelled) return;
      if ("success" in r && r.success) setDetail({ conv: r.conversation, messages: r.messages });
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const filterOptions: { id: SupportStatus | "all"; label: string }[] = useMemo(() => [
    { id: "all", label: "Todas" },
    { id: "ai_handling", label: "IA atendiendo" },
    { id: "waiting_user", label: "Esperando usuario" },
    { id: "escalated", label: "Escaladas" },
    { id: "resolved", label: "Resueltas IA" },
    { id: "closed", label: "Cerradas" },
  ], []);

  return (
    <div>
      <div className="page-title">
        <h1>📋 Conversaciones</h1>
        <p>Timeline completo de las atenciones de la mesa, con triage y escalaciones.</p>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {filterOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setStatusFilter(o.id)}
            className={`btn ${statusFilter === o.id ? "primary" : "ghost"}`}
            style={{ padding: "4px 12px" }}
          >
            {o.label}
          </button>
        ))}
        <button onClick={refresh} className="btn ghost" disabled={loading} style={{ marginLeft: "auto" }}>
          {loading ? <><span className="spinner" /> cargando</> : "↻"}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14 }}>
        {/* Lista */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", fontSize: 12.5, color: "var(--text-soft)" }}>
            {list.length} conversaci{list.length === 1 ? "ón" : "ones"}
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {list.length === 0 && !loading && (
              <div style={{ padding: 14, color: "var(--text-dim)", fontSize: 13 }}>Sin resultados.</div>
            )}
            {list.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: 0, borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{c.user_name || c.user_phone || c.user_email || "(anónimo)"}</div>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.summary ?? "(sin resumen aún)"}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant="muted">{c.channel}</Badge>
                    {c.sap_module && <Badge variant="tech">{c.sap_module}</Badge>}
                    {c.urgency && <Badge variant={c.urgency === "critica" ? "error" : c.urgency === "alta" ? "warn" : "info"}>{c.urgency}</Badge>}
                    <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>{new Date(c.updated_at).toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle */}
        <div className="card">
          {!selectedId && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Selecciona una conversación.</div>}
          {selectedId && detailLoading && !detail && <div><span className="spinner" /> cargando…</div>}
          {detail && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{detail.conv.user_name || "(anónimo)"}</h3>
                  <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge variant="muted">{detail.conv.channel}</Badge>
                    {detail.conv.sap_module && <Badge variant="tech">{detail.conv.sap_module}</Badge>}
                    {detail.conv.urgency && <Badge variant={detail.conv.urgency === "critica" ? "error" : detail.conv.urgency === "alta" ? "warn" : "info"}>{detail.conv.urgency}</Badge>}
                    <Badge variant={statusVariant(detail.conv.status)}>{detail.conv.status}</Badge>
                  </div>
                </div>
                {detail.conv.escalated_to_ticket && (
                  <Link href="/support-desk/tickets" className="btn primary" style={{ fontSize: 12 }}>
                    Ver ticket N2 →
                  </Link>
                )}
              </div>

              {detail.conv.summary && (
                <div className="alert info" style={{ fontSize: 12.5 }}>
                  <b>Resumen IA:</b> {detail.conv.summary}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
                {detail.messages.map((m) => {
                  if (m.role === "system") {
                    return (
                      <div key={m.id} style={{
                        alignSelf: "center",
                        background: "rgba(91,141,239,0.10)",
                        border: "1px solid rgba(91,141,239,0.30)",
                        color: "var(--text-soft)",
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: 12.5,
                        maxWidth: "85%",
                        textAlign: "center",
                      }}>{m.text}</div>
                    );
                  }
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 2, textAlign: isUser ? "right" : "left" }}>
                        {isUser ? "Cliente" : "AMS-Bot"} · {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                      <div style={{
                        background: isUser ? "var(--accent)" : "var(--bg-elev)",
                        color: isUser ? "white" : "var(--text)",
                        padding: "8px 12px",
                        borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                      }}>
                        {isUser ? <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span> : <MarkdownView text={m.text ?? ""} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
