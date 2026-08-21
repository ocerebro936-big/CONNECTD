// Cleanup Worker — remove sessões de upload abandonadas e mantém o
// armazenamento organizado (GC do lado do Object Node). Não apaga objetos
// publicados; só resíduos de uploads interrompidos e não retomados.
import { cloudGateway } from "../gateway";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

export const cleanupCloudWorker: CloudWorker = {
  id: "cleanup",
  intervalMs: 25000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    try {
      const r = await cloudGateway.gc();
      return {
        ok: true,
        summary: `Cleanup: ${r.data?.removed ?? 0} sessões abandonadas removidas.`,
        metrics: { removed: r.data?.removed ?? 0 },
      };
    } catch (e: any) {
      return { ok: false, summary: `Cleanup: falhou (${e?.message || e}).`, metrics: {} };
    }
  },
};
