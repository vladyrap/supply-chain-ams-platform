interface Props {
  variant?: "ok" | "warn" | "error" | "info" | "muted" | "tech";
  children: React.ReactNode;
}

export default function Badge({ variant = "muted", children }: Props) {
  return <span className={`badge ${variant}`}>{children}</span>;
}
