"use client";

interface Props {
  icon?: string;
  title: string;
  desc?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon = "📭", title, desc, ctaLabel, onCta }: Props) {
  return (
    <div className="empty-state">
      <span className="icon">{icon}</span>
      <div className="title">{title}</div>
      {desc && <div className="desc">{desc}</div>}
      {ctaLabel && onCta && (
        <button className="btn primary cta" onClick={onCta}>{ctaLabel}</button>
      )}
    </div>
  );
}
