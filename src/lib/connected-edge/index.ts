// ============================================================================
// Connected Edge/CDN Engine — ponto de entrada
// ----------------------------------------------------------------------------
// Expõe cache, delivery, adaptive media, prefetch e os relatórios que o
// DIVINO consulta (edge_status / cache_status / delivery_trace). Não cria uma
// segunda lógica de seleção: reutiliza o Global Node Manager (#20).
// ============================================================================
import { edgeCache } from "./cache";
import { deliverAsset, getDeliveryTrace, type DeliverOptions } from "./delivery";
import { adaptiveTier, setAdaptiveOverride } from "./adaptive";
import { prefetchAssets } from "./prefetch";
import { globalNodeManager } from "../connected-cloud/global/manager";

export { edgeCache };

let started = false;
export function startEdge(): void {
  if (started) return;
  started = true;
  // sincroniza Nodes + poda cache periodicamente
  const t = setInterval(() => { edgeCache.prune(); globalNodeManager.sync().catch(() => {}); }, 10_000);
  if (typeof (t as any).unref === "function") (t as any).unref();
}
export function stopEdge(): void { started = false; }

export function getEdgeStatus() {
  const cache = edgeCache.stats();
  const snap = globalNodeManager.snapshot();
  return {
    edge: "ONLINE",
    nodesConsidered: snap.nodesTotal,
    cacheHitRate: cache.hitRate,
    cacheEntries: cache.entries,
    adaptiveTier: adaptiveTier(),
    deliveryTraces: getDeliveryTrace().length,
    note: "Edge entrega via cache + Node selecionado pelo Global Node Manager.",
  };
}

export function getCacheStatus() {
  return edgeCache.stats();
}

export { deliverAsset, prefetchAssets, adaptiveTier, setAdaptiveOverride, getDeliveryTrace };
export * from "./types";
