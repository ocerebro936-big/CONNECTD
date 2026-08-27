// DIVINO — Cache Status (hit-rate, entradas, bytes). Só dados reais.
import { getCacheStatus } from "../../connected-edge";

export async function cacheStatus() {
  const s = getCacheStatus();
  const text = [
    "EDGE CACHE",
    "━━━━━━━━━━━━",
    `Entradas: ${s.entries}`,
    `Bytes em cache: ${s.bytes}`,
    `Hits: ${s.hits}`,
    `Misses: ${s.misses}`,
    `Hit-rate: ${s.hitRate}%`,
  ].join("\n");
  return { ok: true, summary: text, data: s };
}
