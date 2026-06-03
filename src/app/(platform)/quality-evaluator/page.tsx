"use client";

import RequirePermission from "@/components/admin/RequirePermission";
import QualityEvaluatorCenter from "@/components/quality/QualityEvaluatorCenter";

export default function QualityEvaluatorPage() {
  return (
    <RequirePermission
      screen="quality_evaluator"
      reason="Quality Evaluator requiere rol con permiso de visualización."
    >
      <QualityEvaluatorCenter />
    </RequirePermission>
  );
}
