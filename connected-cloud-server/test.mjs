// Teste de fumo do Connected Cloud Object Node (real, sem mocks).
import { startServer } from "./server.js";

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0;
function ok(name, cond) { if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.error(`  ✗ ${name}`); } }

async function j(url, opts) {
  const res = await fetch(url, opts);
  const t = await res.text();
  return { status: res.status, body: t ? JSON.parse(t) : {}, text: t };
}

const server = await startServer(PORT);
try {
  const payload = Buffer.from("CONECTED CLOUD OBJECT NODE REAL");
  const key = `test/hello-${Date.now()}.txt`;
  const total = 1;

  // init
  const init = await j(`${BASE}/v1/upload/init`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, ownerId: "u1", mimeType: "text/plain", visibility: "public", checksum: "", totalChunks: total }),
  });
  ok("init devolve sessionId", init.status === 200 && !!init.body.sessionId);

  // chunk
  const put = await fetch(`${BASE}/v1/upload/${init.body.sessionId}/0`, { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: payload });
  ok("upload chunk 200", put.status === 200);

  // complete
  const done = await j(`${BASE}/v1/upload/${init.body.sessionId}/complete`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checksum: "" }),
  });
  ok("complete devolve key", done.status === 200 && done.body.key === key);

  // GET
  const get = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`);
  const got = Buffer.from(await get.arrayBuffer());
  ok("GET devolve bytes iguais", get.status === 200 && got.equals(payload));

  // HEAD metadata
  const head = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`, { method: "HEAD" });
  ok("HEAD tem content-length", head.status === 200 && Number(head.headers.get("content-length")) === payload.length);

  // exists via HEAD 404
  const miss = await fetch(`${BASE}/v1/assets/nope.txt`, { method: "HEAD" });
  ok("objeto inexistente -> 404", miss.status === 404);

  // DELETE
  const del = await j(`${BASE}/v1/assets/${encodeURIComponent(key)}`, { method: "DELETE" });
  ok("DELETE ok", del.status === 200);
  const after = await fetch(`${BASE}/v1/assets/${encodeURIComponent(key)}`, { method: "HEAD" });
  ok("após DELETE -> 404", after.status === 404);

  // health
  const h = await j(`${BASE}/v1/nodes/health`);
  ok("health ready", h.status === 200 && h.body.status === "ready");

  console.log(`\nCloud Server: ${passed} passou, ${failed} falhou`);
} finally {
  server.close();
}
process.exit(failed > 0 ? 1 : 0);
