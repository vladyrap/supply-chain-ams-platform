import { estimateAmsResolutionContextually } from "../src/utils/contextual-ams-estimation-engine";
const result = estimateAmsResolutionContextually({
  title: "Usuario CARLOS.MARTINEZ no puede crear OC en ME21N",
  description: "Usuario CARLOS.MARTINEZ no puede ejecutar ME21N. SU53 muestra M_BEST_BSA faltante.",
});
console.log("baseline:", result.baselineEstimate);
console.log("issueType:", result.detectedContext.issueType);
console.log("similar cases:", result.similarCases.map(c => ({ id: c.caseId, type: c.issueType, h: c.actualResolutionHours })));
console.log("adjustments:", result.contextualAdjustments.map(a => `${a.factor}: x${a.impact} (${a.direction})`));
console.log("totalRange:", result.totalRange);
console.log("phases:", result.phaseBreakdown.length);
