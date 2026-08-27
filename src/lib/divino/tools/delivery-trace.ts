// DIVINO — Delivery Trace (diagnóstico humano: "por que o vídeo está lento?").
import { getDeliveryTrace } from "../../connected-edge";

export async function deliveryTrace() {
  const traces = getDeliveryTrace();
  if (!traces.length) return { ok: true, summary: "Sem entregas rastreadas ainda.", data: { traces: [] } };
  const lines = traces.slice(0, 10).map((t) => {
    const flag = t.cacheStatus === "HIT" ? "⚡ cache" : t.cacheStatus === "MISS" ? "☁ node" : "✗";
    return `${flag} ${t.key} [${t.tier}] ${t.region || "?"} ${t.latencyMs}ms ${t.bytes}B — ${t.note}`;
  });
  const slow = traces.find((t) => t.cacheStatus !== "HIT" && t.latencyMs > 200);
  const diagnosis = slow
    ? `O conteúdo não estava em cache local. Foi solicitado ao Node ${slow.nodeId} (${slow.region}), que respondeu em ${slow.latencyMs}ms. Já está em cache para a próxima vez.`
    : "Entregas normais; a maioria veio do cache Edge.";
  return { ok: true, summary: `${lines.join("\n")}\n\n${diagnosis}`, data: { traces } };
}
