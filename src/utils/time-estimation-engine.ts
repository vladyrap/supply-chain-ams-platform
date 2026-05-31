// Naming alias para que los consumidores que esperan "time-estimation-engine"
// (como dice la spec de Autoestimación de Resolución) encuentren el engine.
// La implementación real vive en src/lib/estimation/engine.ts.

export {
  autoEstimateTicketResolution,
  recalculateTicketResolution,
} from "@/lib/estimation/engine";

export type {
  TicketEstimateInput,
  TicketEstimatedResolution,
  TicketEstimatePhase,
  TicketEstimateOrigin,
  TicketKind,
} from "@/types/estimation";
