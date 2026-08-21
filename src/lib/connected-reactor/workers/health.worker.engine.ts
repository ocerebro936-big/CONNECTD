// Health Worker — latência, disponibilidade de nós, capacidade e erros.
// Produz o relatório de saúde consumido pela supervisão DIVINO.
import { cloudGateway } from "../gateway";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

export const healthCloudWorker: CloudWorker = {
  id: "health",
  intervalMs: 10000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    const t0 = Date.now();
    try {
      const h = await cloudGateway.health();
      const latencyMs = Date.now() - t0;
      const nodes = (h.data?.nodes || []).filter((n: any) => n.status === "ready");
      const total = h.data?.nodes?.length || 0;
      const used = (h.data?.nodes || []).reduce((s: number, n: any) => s + (n.usedBytes || 0), 0);
      const storagePct = Math.min(100, Math.round((used / (1024 * 1024 * 1024 * total || 1)) * 100));
      return {
        ok: h.ok && nodes.length === total,
        summary: `Health: ${nodes.length}/${total} nós online, ${latencyMs}ms.`,
        metrics: { nodesOnline: nodes.length, nodesTotal: total, latencyMs, usedBytes: used, storagePct },
      };
    } catch (e: any) {
      return {
        ok: false,
        summary: `Health: Gateway indisponível (${e?.message || e}).`,
        metrics: { nodesOnline: 0, nodesTotal: 0, latencyMs: Date.now() - t0, storagePct: 0 },
      };
    }
  },
};
