// Testes da Connected Cloud Core (motores internos, implementação em memória).
// Corre com: npx tsx src/lib/connected-cloud/__tests__/cloud.test.ts
import { ConnectedCloud } from "../core/cloud";
import { createMemoryEngines } from "../engines";
import { MemoryObjectStore } from "../storage/object-store";
import { webcrypto as crypto } from "node:crypto";

// polyfill global para o navegador
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = crypto;
}

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function makeCloud() {
  const store = new MemoryObjectStore();
  return new ConnectedCloud(createMemoryEngines({ store }));
}

async function main() {
  // 1) Upload Engine + Dedup
  const cloud = makeCloud();
  const data = new TextEncoder().encode("CONNECTED-KING-CLOUD");
  const a = await cloud.upload({
    ownerId: "u1",
    key: "photos/a.txt",
    data,
    mimeType: "text/plain",
    visibility: "public",
  });
  ok("upload retorna asset READY", a.status === "READY");
  ok("upload preserva tamanho", a.size === data.byteLength);
  ok("upload gera checksum", typeof a.checksum === "string" && a.checksum.length > 0);

  const head = await cloud.head("photos/a.txt");
  ok("head retorna tamanho", !!head && head.size === data.byteLength);

  // dedup: mesmo conteúdo => reutiliza checksum
  const b = await cloud.upload({
    ownerId: "u1",
    key: "photos/a.txt",
    data,
    mimeType: "text/plain",
  });
  ok("dedup mantém checksum", a.checksum === b.checksum);

  // 2) Download Engine + Cache + Security
  const dl = await cloud.download("photos/a.txt", "u1", "u1");
  ok("download devolve dados", !!dl && Buffer.from(dl).toString() === "CONNECTED-KING-CLOUD");
  const cached = await cloud.cacheGet("photos/a.txt");
  ok("cache popula após download", !!cached);

  // 3) Chunk Engine (upload em pedaços + reassembly)
  const cloud2 = makeCloud();
  const big = new Uint8Array(2000);
  for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
  const session = await cloud2.beginChunk({
    sessionId: "s1",
    assetId: "asset-x",
    ownerId: "u2",
    key: "videos/x.bin",
    totalSize: big.length,
    chunkSize: 1000,
  });
  ok("chunk session criada", session.status === "created");
  await cloud2.appendChunk({ sessionId: "s1", index: 0, offset: 0, size: 1000, data: big.slice(0, 1000) });
  await cloud2.appendChunk({ sessionId: "s1", index: 1, offset: 1000, size: 1000, data: big.slice(1000) });
  const done = await cloud2.completeChunk("s1");
  ok("chunk complete retorna tamanho total", done.size === big.length);
  const recovered = await cloud2.download("videos/x.bin", "u2", "u2");
  ok("chunk reassembly correto", !!recovered && recovered.length === big.length && recovered[0] === 0 && recovered[1999] === (1999 & 0xff));

  // 4) Metadata Engine
  await cloud2.setMetadata("videos/x.bin", "u2", { title: "Rei" });
  const meta = await cloud2.getMetadata("videos/x.bin");
  ok("metadata grava/ler", !!meta && meta.title === "Rei");

  // 5) Cache Engine
  await cloud2.cacheSet("k", new TextEncoder().encode("v"));
  const cv = await cloud2.cacheGet("k");
  ok("cache set/get", !!cv && Buffer.from(cv).toString() === "v");

  // 6) Traffic Meter
  await cloud2.recordTraffic("u2", 1234);
  const usage = await cloud2.getTraffic("u2");
  ok("traffic regista bytes", usage.bytes === 1234 && usage.count === 1);

  // 7) Backup + Recovery
  const snap = await cloud2.backup("asset-x", "u2", big);
  ok("backup cria snapshot", typeof snap === "string" && snap.length > 0);
  const recoveredData = await cloud2.recover("asset-x", "u2");
  ok("recovery restaura dados", !!recoveredData && recoveredData.length === big.length);

  // 8) Event Ledger
  const events = await cloud2.listEvents("asset-x");
  ok("event ledger regista eventos", events.length > 0);

  // 9) Health Engine
  const health = await cloud2.healthCheck();
  ok("health retorna status", typeof health.status === "string");

  // 10) Security Engine (rate limit)
  const cloud3 = makeCloud();
  const allowed = await cloud3["engines"].security.checkRateLimit("u3", 10);
  ok("security permite dentro do limite", allowed === true);

  console.log(`\nCloud Core: ${passed} passou, ${failed} falhou`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
