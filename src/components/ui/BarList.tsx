interface Props {
  items: { label: string; value: number; color?: string }[];
  emptyText?: string;
}

export default function BarList({ items, emptyText = "Sin datos todavía" }: Props) {
  if (items.length === 0) {
    return <div style={{ color: "var(--text-dim)", fontSize: 12.5 }}>{emptyText}</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => {
        const pct = (it.value / max) * 100;
        const c = it.color ?? "var(--accent)";
        return (
          <div key={it.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 48px", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{it.label}</span>
            <div style={{ background: "var(--bg-elev)", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: c, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12.5, color: "var(--text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {it.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
