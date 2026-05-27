import Badge from "@/components/ui/Badge";

interface Props {
  phase: number;
  title: string;
  description: string;
  bulletPoints?: string[];
}

export default function ComingSoon({ phase, title, description, bulletPoints = [] }: Props) {
  return (
    <div className="card elev">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        <Badge variant="info">Fase {phase}</Badge>
      </div>
      <p style={{ color: "var(--text-soft)", marginTop: 0, marginBottom: 14 }}>{description}</p>
      {bulletPoints.length > 0 && (
        <ul style={{ marginTop: 8, paddingLeft: 18, color: "var(--text-soft)", fontSize: 13.5 }}>
          {bulletPoints.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
        </ul>
      )}
      <div className="alert info" style={{ marginTop: 14 }}>
        Este módulo está en el roadmap. Aún no es funcional. La estructura, permisos y entry-point ya están listos para que la implementación entre sin romper el resto de la plataforma.
      </div>
    </div>
  );
}
