// Media Worker (Cloud Worker Engine) — supervisiona o processamento de mídia.
// O processamento em si (resize/thumbnail/compressão/derivados) corre no
// ccsUpload (browser leve) ou nos Cloud Nodes (pesado). Aqui contabilizamos
// throughput real a partir dos eventos do Reactor.
import { reactorEvents } from "../events/reactor-events";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

let processed = 0;
let lastKind = "—";
reactorEvents.on((e) => {
  if (e.type === "media_processed") { processed++; lastKind = e.type; }
});

export const mediaCloudWorker: CloudWorker = {
  id: "media",
  intervalMs: 15000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    return {
      ok: true,
      summary: `Media: ${processed} derivados/thumbnails processados.`,
      metrics: { processed, lastKind },
    };
  },
};
