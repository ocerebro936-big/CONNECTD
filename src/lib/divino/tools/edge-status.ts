// DIVINO — Edge Status (cérebro de supervisão da entrega).
import { getEdgeStatus } from "../../connected-edge";

export async function edgeStatus() {
  const s = getEdgeStatus();
  const text = [
    "CONNECTED EDGE",
    "━━━━━━━━━━━━━━━━",
    `Estado: ${s.edge}`,
    `Nodes considerados: ${s.nodesConsidered}`,
    `Cache hit-rate: ${s.cacheHitRate}%`,
    `Entradas em cache: ${s.cacheEntries}`,
    `Adaptive tier: ${s.adaptiveTier}`,
    `Entregas rastreadas: ${s.deliveryTraces}`,
    "",
    s.note,
  ].join("\n");
  return { ok: true, summary: text, data: s };
}
