// Testes do Connected Cloud Node + Node Manager + Cloud Guardian.
// Corre com: npx tsx src/lib/connected-cloud/__tests__/node.test.ts
import { createNode, NodeManager } from "../node/manager";
import { CloudGuardian } from "../node/guardian";
import { webcrypto as crypto } from "node:crypto";

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = crypto;
}

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}`); }
}

async function main() {
  const node = createNode("ck-test", "global", 1000);
  const data = new TextEncoder().encode("NODE-UPLOAD");

  const asset = await node.store({
    ownerId: "u1",
    key: "n/a.txt",
    data,
    mimeType: "text/plain",
  });
  ok("node store funciona", asset.size === data.byteLength);
  ok("node regista carga", node.getNodeInfo().usedBytes === data.byteLength);
  ok("node métrica uploads", node.getMetrics().uploads === 1);

  // verify roundtrip
  const okVerify = await node.verify(asset.key);
  ok("node verify confirma checksum", okVerify === true);

  // status ready num node novo
  node.heartbeat();
  ok("node status ready", node.getNodeInfo().status === "ready");

  // Manager: primário = menor utilização
  const mgr = new NodeManager();
  const a = createNode("a", "r1", 100);
  const b = createNode("b", "r2", 100);
  await a.store({ ownerId: "u", key: "k1", data: new TextEncoder().encode("xxxxxx"), mimeType: "text/plain" });
  mgr.register(a);
  mgr.register(b);
  ok("manager elege primário menos carregado", mgr.primary()?.id === "b");

  // Failover: node offline -> outro assume
  a.setOffline();
  ok("failover ignora node offline", mgr.failover("a")?.id === "b");

  // Replicação real de bytes entre nodes
  const src = createNode("src", "r", 1024 * 1024 * 1024);
  const dst = createNode("dst", "r", 1024 * 1024 * 1024);
  mgr.register(src);
  mgr.register(dst);
  const up = await src.store({ ownerId: "u", key: "rep.txt", data: new TextEncoder().encode("REPLICAR"), mimeType: "text/plain" });
  const replicated = await mgr.replicate(up.key, src, dst);
  const back = await dst.raw(up.key);
  ok("replicação copia bytes", replicated && back && new TextDecoder().decode(back) === "REPLICAR");

  // Guardian: alerta crítico quando node offline
  const guard = new CloudGuardian(mgr);
  const report = guard.report();
  ok("guardian deteta node offline", report.alerts.some((x) => x.code === "NODE_OFFLINE"));

  // node com capacidade real para o painel
  mgr.register(createNode("cap", "r", 1024 * 1024 * 1024 * 1024));
  const dash = guard.dashboard();
  ok("dashboard tem capacidade real", dash.storageTotalTb > 0);
  await dst.retrieve(up.key, "system", "system");
  const dash2 = guard.dashboard();
  ok("dashboard downloads contabiliza", dash2.downloads >= 1);

  console.log(`\nCloud Node: ${passed} passou, ${failed} falhou`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
