interface Props {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "ok" | "warn" | "info" | "tech";
}

const ACCENT_COLOR: Record<NonNullable<Props["accent"]>, string> = {
  default: "var(--text)",
  ok:      "var(--ok)",
  warn:    "var(--warn)",
  info:    "var(--accent)",
  tech:    "var(--magenta)",
};

export default function KPI({ label, value, hint, accent = "default" }: Props) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11.5, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT_COLOR[accent], marginTop: 4, letterSpacing: "-0.01em" }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
