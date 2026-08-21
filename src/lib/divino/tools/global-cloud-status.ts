// DIVINO — Global Cloud Status (cérebro de supervisão). Só mostra números
// obtidos de Nodes reais; sem dados, apresenta "—" (nunca inventa métricas).
import { globalNodeManager } from "../../connected-cloud/global/manager";

export async function globalCloudStatus() {
  await globalNodeManager.sync();
  const s = globalNodeManager.snapshot();
  const dash = [
    "CONNECTED CLOUD",
    "━━━━━━━━━━━━━━━━━━━━━━",
    `🌍 Regiões       ${s.regions.length}`,
    `🟢 Nodes        ${s.nodesOnline}/${s.nodesTotal}`,
    `💾 Storage      ${s.storagePct ?? "—"}%`,
    `⚡ Latência     ${s.latencyAvgMs ?? "—"}ms`,
    `📤 Uploads      ${s.uploads ?? "—"}`,
    `🔄 Replicação   ${s.replication}`,
    `💾 Backups      ${s.backups}`,
    `🛡️ Segurança    ${s.security}`,
    "",
    s.routingNote,
  ];
  const byRegion = s.nodes.map(
    (n) => `${n.region}   ${n.status === "online" ? "🟢" : n.status === "degraded" ? "🟡" : "⚪"}   ${n.latencyMs ? n.latencyMs + "ms" : "—"}`,
  );
  return { ok: true, summary: [...dash, ...byRegion].join("\n"), data: s };
}
