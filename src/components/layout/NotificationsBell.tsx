"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchNotifications, type NotificationItem } from "@/services/dashboard.api";
import Badge from "@/components/ui/Badge";

const LAST_READ_KEY = "ams-notif-last-read-v1";
const POLL_INTERVAL_MS = 10000;

const KIND_ICON: Record<NotificationItem["kind"], string> = {
  ticket_escalated: "🚨",
  ticket_resolved:  "✅",
  kb_approved:      "📘",
  meeting_done:     "🎙️",
  incident_created: "🤖",
};
const KIND_VARIANT: Record<NotificationItem["kind"], "ok" | "warn" | "info" | "tech" | "muted"> = {
  ticket_escalated: "warn",
  ticket_resolved:  "ok",
  kb_approved:      "ok",
  meeting_done:     "tech",
  incident_created: "info",
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.round(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.round(h / 24);
  return `hace ${d}d`;
}

export default function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  // SSR-safe: valor inicial determinista (""); se hidrata desde localStorage tras
  // montar. En el primer render items=[] → unreadCount=0, así que "" no afecta la UI.
  const [lastRead, setLastRead] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchNotifications();
    if (r.ok) setItems(r.items);
    setLoading(false);
  }, []);

  // Hidratar lastRead desde localStorage tras montar (no en el render → SSR-safe)
  useEffect(() => {
    setLastRead(window.localStorage.getItem(LAST_READ_KEY) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Cierra al click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unreadCount = items.filter((i) => i.createdAt > lastRead).length;

  function markAllRead() {
    const ts = new Date().toISOString();
    setLastRead(ts);
    if (typeof window !== "undefined") window.localStorage.setItem(LAST_READ_KEY, ts);
  }

  function onItemClick(it: NotificationItem) {
    // Marcar como leído todo lo que esté antes-o-igual a este item
    if (it.createdAt > lastRead) {
      const ts = new Date().toISOString();
      setLastRead(ts);
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_READ_KEY, ts);
    }
    setOpen(false);
    router.push(it.href);
  }

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ""}`}
        className="btn ghost btn-icon"
        style={{ position: "relative", fontSize: 18, padding: "6px 10px" }}
        title="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2, right: 2,
            minWidth: 16, height: 16,
            background: "var(--error)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 8,
            padding: "0 4px",
            display: "grid",
            placeItems: "center",
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: 380,
          maxHeight: "70vh",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          boxShadow: "0 20px 48px rgba(0,0,0,0.45)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
        }}>
          <div className="row between" style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border-soft)",
          }}>
            <strong style={{ fontSize: 13.5 }}>Notificaciones</strong>
            <div className="row" style={{ gap: 6 }}>
              {loading && <span className="spinner" />}
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="btn ghost" style={{ padding: "2px 8px", fontSize: 11 }}>
                  Marcar todas leídas
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {items.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontSize: 12.5 }}>
                Sin notificaciones recientes.
              </div>
            )}
            {items.map((it) => {
              const isUnread = it.createdAt > lastRead;
              return (
                <button
                  key={it.id}
                  onClick={() => onItemClick(it)}
                  style={{
                    display: "flex", gap: 10, padding: "10px 14px",
                    width: "100%", textAlign: "left",
                    background: isUnread ? "var(--accent-soft)" : "transparent",
                    border: 0,
                    borderBottom: "1px solid var(--border-soft)",
                    color: "inherit", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, flexShrink: 0 }}>{KIND_ICON[it.kind]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, fontWeight: isUnread ? 600 : 500 }}>{it.title}</span>
                      {it.badge && <span className="badge muted" style={{ fontSize: 10 }}>{it.badge}</span>}
                      {isUnread && <span style={{
                        width: 6, height: 6, borderRadius: 3,
                        background: "var(--accent)", marginLeft: "auto",
                      }} />}
                    </div>
                    {it.subtitle && (
                      <div style={{
                        fontSize: 11.5, color: "var(--text-soft)", marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={it.subtitle}>
                        {it.subtitle}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>
                      {timeAgo(it.createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontSize: 11, color: "var(--text-dim)",
            textAlign: "center",
          }}>
            Polling cada {POLL_INTERVAL_MS / 1000}s · {items.length} en vista
          </div>
        </div>
      )}
    </div>
  );
}
