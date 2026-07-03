"use client";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
  icon?: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
}

export default function TrainingMetricCard({ label, value, hint, color = "#4589ff", icon, trend, trendLabel }: Props) {
  return (
    <div className="tc-metric" style={{ ["--tc-acc" as never]: color }}>
      <div className="tc-metric-head">
        {icon && <span className="tc-metric-icon">{icon}</span>}
        <span className="tc-metric-label">{label}</span>
      </div>
      <div className="tc-metric-value">{value}</div>
      {(hint || trendLabel) && (
        <div className="tc-metric-foot">
          {trend && <span className={`tc-trend ${trend}`}>{trend === "up" ? "▲" : trend === "down" ? "▼" : "■"}</span>}
          <span>{trendLabel || hint}</span>
        </div>
      )}
    </div>
  );
}
