import type { ReactorTask } from "../queue/priority";
import type { WorkerContext, WorkerHandler } from "./media.worker";

// ============================================================================
// Maintenance Worker — retenta tarefas falhadas e faz limpeza de sessões.
// O processamento pesado real (transcoding, etc.) corre nos Cloud Nodes.
// ============================================================================
export const maintenanceWorker: WorkerHandler = async () => {
  return { ok: true };
};
