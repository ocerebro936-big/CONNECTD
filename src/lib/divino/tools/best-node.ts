// DIVINO — Best Node (seleção inteligente por peso: saúde+capacidade+distância+custo+carga).
import { globalNodeManager } from "../../connected-cloud/global/manager";
import type { CloudRegion } from "../../connected-cloud/global/types";

export async function bestNode(ctx: { args?: { region?: CloudRegion } }) {
  await globalNodeManager.sync();
  const best = globalNodeManager.selectBestNode(ctx?.args?.region ? { region: ctx.args.region } : {});
  if (!best) return { ok: false, summary: "Nenhum node disponível (todos offline)." };
  return {
    ok: true,
    summary: `Melhor node: ${best.id} (${best.region}) · status=${best.status} · lat=${best.latencyMs || "—"}ms`,
    data: best,
  };
}
