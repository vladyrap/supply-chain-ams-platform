import Badge from "@/components/ui/Badge";
import MarkdownView from "./MarkdownView";
import type { ChatMessage } from "@/types";

interface ToolCallSummary {
  name: string;
  args: Record<string, unknown>;
  durationMs: number;
  resultSummary: string;
}

const TOOL_ICONS: Record<string, string> = {
  sap_get_purchase_order:  "🛒",
  sap_list_purchase_orders:"🛒",
  sap_get_sales_order:     "🧾",
  sap_list_sales_orders:   "🧾",
  sap_get_material:        "📦",
  sap_list_materials:      "📦",
  sap_list_stock_movements:"🔄",
  kb_search:               "📘",
  rag_search:              "📚",
};

function confidenceVariant(c: string): "ok" | "warn" | "error" | "muted" {
  switch (c) {
    case "alta":  return "ok";
    case "media": return "warn";
    case "baja":  return "error";
    default:       return "muted";
  }
}

interface Props {
  msg: ChatMessage;
  /** True cuando este mensaje del agente está siendo "tipeado" en vivo. */
  streaming?: boolean;
}

export default function MessageItem({ msg, streaming = false }: Props) {
  const isUser = msg.role === "user";
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // Tool calls (sólo presentes en mensajes del agente en modo research)
  const md = msg.metadata as (ChatMessage["metadata"] & {
    toolCalls?: ToolCallSummary[];
    iterations?: number;
  }) | undefined;
  const toolCalls = md?.toolCalls ?? [];
  return (
    <div className={`msg ${msg.role}`}>
      <div className="head">
        <strong style={{ color: isUser ? "var(--accent)" : "var(--magenta)" }}>
          {isUser ? "Tú" : "Agente AMS"}
        </strong>
        <span>· {time}</span>
        {msg.attachments && msg.attachments.length > 0 && (
          <Badge variant="info">📎 {msg.attachments.length}</Badge>
        )}
        {streaming && <Badge variant="info">en vivo…</Badge>}
        {toolCalls.length > 0 && (
          <Badge variant="tech">🔬 {toolCalls.length} tool{toolCalls.length === 1 ? "" : "s"}</Badge>
        )}
        {md?.iterations && md.iterations > 1 && (
          <Badge variant="muted">{md.iterations} iters</Badge>
        )}
        {msg.metadata && (
          <>
            <Badge variant="muted">{msg.metadata.model}</Badge>
            <Badge variant={confidenceVariant(msg.metadata.confidence)}>
              confianza: {msg.metadata.confidence}
            </Badge>
          </>
        )}
      </div>

      {toolCalls.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6,
          marginBottom: 8,
          padding: "8px 10px",
          background: "rgba(199,128,240,0.06)",
          border: "1px solid rgba(199,128,240,0.20)",
          borderRadius: 6,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-soft)", width: "100%", marginBottom: 4 }}>
            <b>El agente consultó:</b>
          </div>
          {toolCalls.map((tc, i) => {
            const icon = TOOL_ICONS[tc.name] ?? "🔧";
            const argsStr = Object.entries(tc.args)
              .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
              .join(", ");
            return (
              <div
                key={i}
                title={`Args: ${argsStr || "(ninguno)"}\nResultado: ${tc.resultSummary}\nDuración: ${tc.durationMs}ms`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 8px",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 11.5,
                  fontFamily: "ui-monospace, monospace",
                  color: "var(--text)",
                }}
              >
                <span>{icon}</span>
                <code style={{ background: "transparent" }}>{tc.name}</code>
                {argsStr && (
                  <span style={{ color: "var(--text-dim)", fontSize: 10.5 }}>
                    ({argsStr.slice(0, 40)}{argsStr.length > 40 ? "…" : ""})
                  </span>
                )}
                <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{tc.durationMs}ms</span>
              </div>
            );
          })}
        </div>
      )}

      {msg.attachments && msg.attachments.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 6,
            marginBottom: msg.text ? 10 : 0,
          }}
        >
          {msg.attachments.map((a, i) => (
            <a
              key={`${a.name}-${i}`}
              href={a.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`${a.name} — abrir en pestaña nueva`}
              style={{ display: "block", borderRadius: 6, overflow: "hidden" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.dataUrl}
                alt={a.name}
                style={{ width: "100%", height: 96, objectFit: "cover", display: "block", border: "1px solid var(--border)" }}
              />
            </a>
          ))}
        </div>
      )}

      {msg.text && (
        isUser
          ? <div className="body">{msg.text}</div>
          : (
            <div className="body">
              <MarkdownView text={msg.text} />
              {streaming && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 14,
                    marginLeft: 2,
                    background: "var(--accent)",
                    verticalAlign: "-2px",
                    animation: "ams-caret 0.9s steps(2) infinite",
                  }}
                />
              )}
            </div>
          )
      )}
    </div>
  );
}
