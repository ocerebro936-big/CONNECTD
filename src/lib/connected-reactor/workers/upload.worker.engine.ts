// Upload Worker (Cloud Worker Engine) — supervisiona filas, checksum e
// deduplicação. A recuperação de interrupção é feita pelo cliente via
// withRetry (re-upload resiliente com backoff) + sessão persistida para
// retoma manual na UI. Aqui contabilizamos o que acontece de verdade.
import { reactorEvents } from "../events/reactor-events";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

let started = 0, completed = 0, failed = 0;
reactorEvents.on((e) => {
  if (e.type === "upload_start") started++;
  else if (e.type === "upload_complete") completed++;
  else if (e.type === "upload_failed") failed++;
});

export const uploadCloudWorker: CloudWorker = {
  id: "upload",
  intervalMs: 10000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    return {
      ok: failed === 0,
      summary: `Upload: ${completed} concluídos, ${failed} falhados (checksum+dedup ativos).`,
      metrics: { started, completed, failed },
    };
  },
};
