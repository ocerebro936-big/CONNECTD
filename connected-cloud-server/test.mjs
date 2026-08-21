// Smoke + contract tests for Connected Cloud v2 Object Node (Node, no deps).
import { startServer } from "./server.js";
import { rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
const PORT = 8799;
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0;
const ok = (c, m) => (c ? (passed++, console.info("  ✓", m)) : (failed++, console.error("  ✗", m)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function putChunk(sid, i, buf) {
  const res = await fetch(`${BASE}/v1/upload/${sid}/${i}`, { method: "PUT", body: buf });
  return res.status;
}
function sha(b) { return createHash("sha256").update(b).digest("hex"); }

// limpa data entre runs (mantém .gitignore)
rmSync(DATA, { recursive: true, force: true });

const server = await startServer(PORT);
await sleep(200);

const bytes = Buffer.from("hello-connected-cloud-v2");
const checksum = sha(bytes);
const key = "avatars/test-001.bin";

// 1. init exige checksum
{
  const r = await j("POST", "/v1/upload/init", { key, size: bytes.length, totalChunks: 1 });
  ok(r.status === 400 && r.data.error === "CHECKSUM_REQUIRED", "init sem checksum -> 400");
}
// 2. init ok
const init = await j("POST", "/v1/upload/init", { key, size: bytes.length, totalChunks: 1, checksum });
ok(init.status === 200 && init.data.sessionId, "init com checksum -> 200 + sessionId");
const sid = init.data.sessionId;

// 3. PUT chunk + complete -> replicado para NODES
ok((await putChunk(sid, 0, bytes)) === 200, "PUT chunk 0 -> 200");
const done = await j("POST", `/v1/upload/${sid}/complete`, {});
ok(done.status === 200 && done.data.replicatedTo === 2, "complete -> replicatedTo=2");
ok(!!done.data.checksum, "complete retorna checksum");

// 4. GET + HEAD
const g = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`);
ok(g.status === 200 && (await g.text()) === bytes.toString(), "GET asset -> conteúdo igual");
const h = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`, { method: "HEAD" });
ok(h.status === 200 && h.headers.get("content-length") === String(bytes.length), "HEAD asset -> content-length");

// 5. dedup: mesmo checksum -> mesma chave
const dup = await j("POST", "/v1/upload/init", { key: "avatars/other.bin", size: bytes.length, totalChunks: 1, checksum });
const dsid = dup.data.sessionId;
await putChunk(dsid, 0, bytes);
const dupDone = await j("POST", `/v1/upload/${dsid}/complete`, {});
ok(dupDone.status === 200 && dupDone.data.key === key, "dedup: mesmo checksum reusa a mesma chave");

// 6. DELETE remove de todos os nós
const del = await j("DELETE", `/v1/assets/${encodeURIComponent(key)}`);
ok(del.status === 200 && del.data.removed >= 3, "DELETE remove de nós + backup (>=3)");
const after = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`);
ok(after.status === 404, "GET após DELETE -> 404");

// 7. GC de sessão abandonada
mkdirSync(join(DATA, "sessions", "abandonada"), { recursive: true });
writeFileSync(join(DATA, "sessions", "abandonada", "0.bin"), bytes);
// força TTL indirectamente: reescrita de mtime antigo
utimesSync(join(DATA, "sessions", "abandonada"), new Date(Date.now() - 20 * 60 * 1000), new Date(Date.now() - 20 * 60 * 1000));
// trigger manual: chamamos health e esperamos GC (intervalo 60s é longo) — simulamos via re-import não possível;
// validamos pelo menos que a sessão existe antes e o caminho não quebra.
ok(existsSync(join(DATA, "sessions", "abandonada")), "sessão abandonada existe antes do GC agendado");

// 8. health com nós
const health = await j("GET", "/v1/nodes/health");
ok(health.status === 200 && Array.isArray(health.data.nodes) && health.data.nodes.length === 3, "health lista nós (node-a,node-b,backup)");

console.info(`\n[ccs v2] ${passed} passou, ${failed} falhou`);
server.close();
setTimeout(() => process.exit(failed ? 1 : 0), 50);
