"use client";

type Status = "completed" | "pending" | "alert";

export interface PipelineStage {
  id: string;
  label: string;
  icon: string;
  status: Status;
  meta?: string;
}

interface Props {
  stages: PipelineStage[];
}

export default function TrainingPipeline({ stages }: Props) {
  return (
    <div className="tc-pipeline">
      {stages.map((s, i) => (
        <div key={s.id} className={`tc-pipe-stage ${s.status}`}>
          <span className="tc-pipe-dot">{s.icon}</span>
          <div className="tc-pipe-body">
            <div className="tc-pipe-label">{s.label}</div>
            {s.meta && <div className="tc-pipe-meta">{s.meta}</div>}
          </div>
          {i < stages.length - 1 && <span className="tc-pipe-conn" aria-hidden />}
        </div>
      ))}
    </div>
  );
}
