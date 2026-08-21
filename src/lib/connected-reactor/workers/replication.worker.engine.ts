// Replication Worker — garante que cada objeto existe em todos os nós.
// Verifica por-nó (HEAD) e replica automaticamente os em falta; deteta e
// reconstrói réplicas perdidas. Em produção os nós ficam em regiões diferentes.
import { cloudGateway } from "../gateway";
import { reactorEvents } from "../events/reactor-events";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

const seen = new Set<string>();
reactorEvents.on((e) => {
  if (e.type === "upload_complete" && e.key) seen.add(e.key);
});

export const replicationCloudWorker: CloudWorker = {
  id: "replication",
  intervalMs: 20000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    let nodes: string[] = [];
    let verified = 0, replicated = 0, missing = 0;
    try {
      const h = await cloudGateway.health();
      nodes = (h.data?.nodes || []).map((n: any) => n.id);
      for (const key of seen) {
        for (const node of nodes) {
          const ok = await cloudGateway.nodeHead(node, key);
          verified++;
          if (!ok) {
            missing++;
            const r = await cloudGateway.replicate(key);
            if (r.ok) replicated += (r.data?.replicated || 0);
          }
        }
      }
    } catch (e: any) {
      return { ok: false, summary: `Replication: Gateway indisponível (${e?.message || e}).`, metrics: { nodes } };
    }
    return {
      ok: missing === 0,
      summary: missing === 0 ? `Replication: ${nodes.length} nós OK, ${verified} verificações.` : `Replication: ${replicated} réplicas reconstruídas, ${missing} em falta.`,
      metrics: { nodes: nodes.length, verified, replicated, missing },
    };
  },
};
