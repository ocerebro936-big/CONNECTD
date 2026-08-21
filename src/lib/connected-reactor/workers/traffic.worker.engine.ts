// Traffic Worker — mede upload/download e alimenta o Connected Economy Engine.
// REGRA: tráfego NÃO vira dinheiro do utilizador. O recordUsage contabiliza
// utilização/metering da plataforma (receita/custo), mantendo a separação
// availableCash / pendingCash / withdrawnCash (ledger + antifraude).
import { reactorEvents } from "../events/reactor-events";
import { recordUsage } from "../../economy/traffic";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

const pending = new Map<string, number>();
let uploaded = 0, downloaded = 0;
reactorEvents.on((e) => {
  if (e.type === "upload_complete" && e.bytes) { uploaded += e.bytes; if (e.ownerId) pending.set(e.ownerId, (pending.get(e.ownerId) || 0) + e.bytes); }
});

export const trafficCloudWorker: CloudWorker = {
  id: "traffic",
  intervalMs: 20000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    let flushed = 0;
    for (const [ownerId, bytes] of pending) {
      try {
        await recordUsage({ userId: ownerId, assetId: "ccs-traffic", uploadBytes: bytes });
        flushed++;
      } catch { /* metering opcional */ }
    }
    pending.clear();
    return {
      ok: true,
      summary: `Traffic: ${flushed} utilizadores metrados (plataforma, não crédito do utilizador).`,
      metrics: { uploadedBytes: uploaded, downloadedBytes: downloaded, metered: flushed },
    };
  },
};
