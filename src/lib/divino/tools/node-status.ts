// DIVINO — Node Status (estado real de um Node/região).
import { globalNodeManager } from "../../connected-cloud/global/manager";

export async function nodeStatus(ctx: { args?: { node?: string; region?: string } }) {
  const id = ctx?.args?.node || ctx?.args?.region;
  await globalNodeManager.sync();
  const s = globalNodeManager.snapshot();
  const nodes = id ? s.nodes.filter((n) => n.id === id || n.region === id) : s.nodes;
  if (!nodes.length) return { ok: false, summary: `Node "${id}" desconhecido ou sem dados reais (—).` };
  const txt = nodes
    .map(
      (n) =>
        `${n.id} [${n.region}] ${n.status} · lat=${n.latencyMs || "—"}ms · ${(n.usedBytes / 1e9).toFixed(1)}GB/${(n.capacityBytes / 1e9).toFixed(0)}GB`,
    )
    .join("\n");
  return { ok: true, summary: txt, data: nodes };
}
