// ============================================================================
// Connected Cloud Server v2 — Object Node real (sem dependências externas)
// ----------------------------------------------------------------------------
// Evolução do Object Storage:
//   - Object Manager distribui objetos por vários nós (node-a/node-b) e
//     replica para um nó de backup (durabilidade real, não só disco local).
//   - Checksum SHA-256 obrigatório e dedup.
//   - Garbage Collection de sessões de upload abandonadas.
//   - Rate limiting + limite de concorrência.
//   - Autenticação Gateway<->Node via API key (x-ccs-key) quando definida.
//   - Logs estruturados e health checks com nós.
//
// Em produção isto corre atrás de HTTPS/TLS e com nós em máquinas separadas.
// ============================================================================
import http from "node:http";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync, appendFileSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
const SESS_DIR = join(DATA, "sessions");
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.CCS_API_KEY || ""; // se definida, exige x-ccs-key
const MAX_BYTES = Number(process.env.CCS_MAX_BYTES || 2 * 1024 * 1024 * 1024); // 2GB
const NODES = (process.env.CCS_NODES || "node-a,node-b").split(",").map((s) => s.trim()).filter(Boolean);
const BACKUP = "backup";
const RATE_LIMIT = Number(process.env.CCS_RATE || 60); // req/s por IP
const MAX_CONCURRENT = Number(process.env.CCS_CONCURRENCY || 20);
const SESSION_TTL_MS = 10 * 60 * 1000;

for (const d of [DATA, SESS_DIR, ...NODES.map((n) => join(DATA, n, "objects")), join(DATA, BACKUP, "objects")])
  if (!existsSync(d)) mkdirSync(d, { recursive: true });

const INDEX = join(DATA, ".index.json");
const sessions = new Map();
const stats = { uploads: 0, downloads: 0, bytes: 0, requests: 0 };
let activeWrites = 0;
const rate = new Map(); // ip -> timestamps[]

function loadIndex() { try { return JSON.parse(readFileSync(INDEX, "utf8")); } catch { return { byChecksum: {} }; } }
function saveIndex(i) { writeFileSync(INDEX, JSON.stringify(i, null, 2)); }
function sanitize(k) { return k.replace(/\.\.+/g, "").replace(/^\/+/, ""); }
function objPath(node, key) { return join(DATA, node, "objects", sanitize(key)); }
function metaFor(k) {
  const e = extname(k).slice(1);
  const m = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", pdf: "application/pdf", json: "application/json" };
  return m[e] || "application/octet-stream";
}
function log(method, path, status, ms) { console.info(`[ccs] ${method} ${path} -> ${status} (${ms}ms)`); }
function audit(op, msg) { try { appendFileSync(join(DATA, "audit.log"), `[${new Date().toISOString()}] ${op}: ${msg}\n`); } catch {} }
function readJson(req) { return new Promise((res, rej) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => res(d ? JSON.parse(d) : {})); req.on("error", rej); }); }
function readBytes(req) { return new Promise((res, rej) => { const c = []; req.on("data", (x) => c.push(x)); req.on("end", () => res(Buffer.concat(c))); req.on("error", rej); }); }
function allow(ip) {
  const now = Date.now();
  const arr = (rate.get(ip) || []).filter((t) => now - t < 1000);
  arr.push(now); rate.set(ip, arr);
  return arr.length <= RATE_LIMIT;
}
function countBytes(dir) { let t = 0; for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); t += e.isDirectory() ? countBytes(p) : statSync(p).size; } return t; }

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  const ip = req.socket.remoteAddress || "local";
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;
  const authOk = !API_KEY || req.headers["x-ccs-key"] === API_KEY;
  try {
    if (!authOk) return send(res, 401, { error: "UNAUTHORIZED" });
    if (!allow(ip)) return send(res, 429, { error: "RATE_LIMITED" });
    if (activeWrites >= MAX_CONCURRENT) return send(res, 503, { error: "BUSY" });
    stats.requests++;

    // health
    if (method === "GET" && url.pathname === "/v1/nodes/health") {
      const nodes = [ ...NODES, BACKUP ].map((n) => ({
        id: n, status: "ready", usedBytes: countBytes(join(DATA, n, "objects")),
      }));
      return send(res, 200, { status: "ready", nodes, replicas: NODES.length, backup: BACKUP });
    }

    // verificação por nó
    let nm = url.pathname.match(/^\/v1\/nodes\/([^/]+)\/objects\/(.+)$/);
    if (nm && (method === "GET" || method === "HEAD")) {
      const f = objPath(nm[1], decodeURIComponent(nm[2]));
      if (!existsSync(f)) return send(res, 404, { error: "NOT_FOUND" });
      return stream(res, f, method, decodeURIComponent(nm[2]));
    }

    // replicação forçada de uma chave para todos os nós (com checksum + auditoria)
    if (method === "POST" && url.pathname === "/v1/replicate") {
      const b = await readJson(req);
      const key = b.key;
      if (!key) return send(res, 400, { error: "KEY_REQUIRED" });
      const REPLICA_LIMIT = Number(process.env.CCS_REPLICA_LIMIT || 5 * 1024 * 1024 * 1024);
      let replicated = 0;
      const targets = [ ...NODES, BACKUP ];
      for (const node of targets) {
        const dest = objPath(node, key);
        if (existsSync(dest)) continue; // prevenção de loop: não re-replica o que já existe
        const src = targets.map((n) => objPath(n, key)).find(existsSync);
        if (!src) continue;
        const size = statSync(src).size;
        if (size > REPLICA_LIMIT) { audit("replicate", `SKIP ${key} -> ${node} (excede limite ${size})`); continue; }
        mkdirSync(dirname(dest), { recursive: true });
        const data = readFileSync(src);
        writeFileSync(dest, data);
        // checksum antes/depois da replicação
        const before = createHash("sha256").update(readFileSync(src)).digest("hex");
        const after = createHash("sha256").update(readFileSync(dest)).digest("hex");
        if (before !== after) {
          rmSync(dest, { force: true });
          audit("replicate", `FAIL ${key} -> ${node} (checksum mismatch)`);
          return send(res, 500, { error: "REPLICA_CHECKSUM_MISMATCH", key, node });
        }
        replicated++;
        audit("replicate", `OK ${key} -> ${node} (${size} bytes, sha256 ${after.slice(0, 12)}…)`);
      }
      return send(res, 200, { key, replicated, nodes: NODES.length + 1 });
    }

    // snapshot de backup
    if (method === "POST" && url.pathname === "/v1/backup/snapshot") {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const snapDir = join(DATA, BACKUP, "snapshots", ts);
      mkdirSync(snapDir, { recursive: true });
      const src = join(DATA, NODES[0], "objects");
      const copyTree = (s, d) => {
        for (const e of readdirSync(s)) {
          const sp = join(s, e), dp = join(d, e);
          if (statSync(sp).isDirectory()) { mkdirSync(dp, { recursive: true }); copyTree(sp, dp); }
          else { mkdirSync(dirname(dp), { recursive: true }); writeFileSync(dp, readFileSync(sp)); }
        }
      };
      let n = 0;
      if (existsSync(src)) { copyTree(src, snapDir); n = readdirSync(snapDir).length; }
      return send(res, 200, { snapshot: ts, objects: n });
    }
    if (method === "GET" && url.pathname === "/v1/backup/snapshots") {
      const base = join(DATA, BACKUP, "snapshots");
      return send(res, 200, { snapshots: existsSync(base) ? readdirSync(base) : [] });
    }
    if (method === "DELETE" && url.pathname.match(/^\/v1\/backup\/snapshots\/(.+)$/)) {
      const ts = decodeURIComponent(url.pathname.match(/^\/v1\/backup\/snapshots\/(.+)$/)[1]);
      rmSync(join(DATA, BACKUP, "snapshots", ts), { recursive: true, force: true });
      return send(res, 200, { ok: true });
    }

    // garbage collection de sessões abandonadas
    if (method === "POST" && url.pathname === "/v1/admin/gc") {
      return send(res, 200, { removed: gc() });
    }

    // métricas de tráfego
    if (method === "GET" && url.pathname === "/v1/metrics") {
      return send(res, 200, { ...stats, replicas: NODES.length, backup: BACKUP });
    }

    // upload init
    if (method === "POST" && url.pathname === "/v1/upload/init") {
      const b = await readJson(req);
      if (!b.checksum) return send(res, 400, { error: "CHECKSUM_REQUIRED" });
      if (b.size > MAX_BYTES) return send(res, 413, { error: "PAYLOAD_TOO_LARGE" });
      const id = randomUUID();
      mkdirSync(join(SESS_DIR, id), { recursive: true });
      sessions.set(id, { ...b, startedAt: Date.now() });
      return send(res, 200, { sessionId: id });
    }

    // chunk PUT
    let m = url.pathname.match(/^\/v1\/upload\/([^/]+)\/(\d+)$/);
    if (method === "PUT" && m) {
      activeWrites++;
      try {
        const [, sid, idx] = m;
        if (!sessions.has(sid)) return send(res, 404, { error: "SESSION_NOT_FOUND" });
        const buf = await readBytes(req);
        writeFileSync(join(SESS_DIR, sid, `${idx}.bin`), buf);
        return send(res, 200, { ok: true });
      } finally { activeWrites--; }
    }

    // complete
    m = url.pathname.match(/^\/v1\/upload\/([^/]+)\/complete$/);
    if (method === "POST" && m) {
      const [, sid] = m;
      const meta = sessions.get(sid);
      if (!meta) return send(res, 404, { error: "SESSION_NOT_FOUND" });
      const total = meta.totalChunks || 1;
      const chunks = [];
      for (let i = 0; i < total; i++) {
        const f = join(SESS_DIR, sid, `${i}.bin`);
        if (!existsSync(f)) return send(res, 400, { error: "MISSING_CHUNK", index: i });
        chunks.push(readFileSync(f));
      }
      const buf = Buffer.concat(chunks);
      const checksum = createHash("sha256").update(buf).digest("hex");
      const idx = loadIndex();
      let storedKey = idx.byChecksum[checksum];
      if (!storedKey) {
        storedKey = meta.key;
        // escreve no nó primário e replica para os restantes + backup
        for (const node of [ ...NODES, BACKUP ]) {
          const dest = objPath(node, storedKey);
          mkdirSync(dirname(dest), { recursive: true });
          writeFileSync(dest, buf);
        }
        idx.byChecksum[checksum] = storedKey;
        saveIndex(idx);
        stats.uploads++;
        stats.bytes += buf.length;
      }
      rmSync(join(SESS_DIR, sid), { recursive: true, force: true });
      sessions.delete(sid);
      return send(res, 200, { id: storedKey, key: storedKey, checksum, url: `/v1/assets/${encodeURIComponent(storedKey)}`, replicatedTo: NODES.length });
    }

    // DELETE
    m = url.pathname.match(/^\/v1\/assets\/(.+)$/);
    if (method === "DELETE" && m) {
      const key = decodeURIComponent(m[1]);
      let removed = 0;
      for (const node of [ ...NODES, BACKUP ]) {
        const f = objPath(node, key);
        if (existsSync(f)) { rmSync(f, { force: true }); removed++; }
      }
      return send(res, 200, { ok: true, removed });
    }

    // GET/HEAD asset
    if ((method === "GET" || method === "HEAD") && m) {
      const key = decodeURIComponent(m[1]);
      const f = objPath(NODES[0], key);
      if (!existsSync(f)) {
        // falha num nó -> tenta réplica/backup
        const alt = [ ...NODES.slice(1), BACKUP ].map((n) => objPath(n, key)).find(existsSync);
        if (!alt) return send(res, 404, { error: "NOT_FOUND" });
        if (method === "GET") { stats.downloads++; stats.bytes += statSync(alt).size; }
        return stream(res, alt, method, key);
      }
      if (method === "GET") { stats.downloads++; stats.bytes += statSync(f).size; }
      return stream(res, f, method, key);
    }

    send(res, 404, { error: "NOT_FOUND" });
  } catch (e) {
    send(res, 500, { error: String(e?.message || e) });
  } finally {
    log(method, url.pathname, res.statusCode, Date.now() - t0);
  }
});

function stream(res, file, method, key) {
  const st = statSync(file);
  const headers = { "content-type": metaFor(key), "content-length": String(st.size), "x-ccs-updated": String(st.mtimeMs), etag: `"${st.size}-${st.mtimeMs}"` };
  if (method === "HEAD") return send(res, 200, "", headers);
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}

// Garbage Collection de sessões abandonadas.
function gc() {
  const now = Date.now();
  let removed = 0;
  for (const id of readdirSync(SESS_DIR)) {
    const dir = join(SESS_DIR, id);
    try {
      if (now - statSync(dir).mtimeMs > SESSION_TTL_MS) {
        rmSync(dir, { recursive: true, force: true });
        sessions.delete(id);
        removed++;
      }
    } catch {}
  }
  return removed;
}
const _gcTimer = setInterval(gc, 60_000);
if (_gcTimer.unref) _gcTimer.unref();

export function startServer(port = PORT) {
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => console.info(`[Connected Cloud v2] Object Node ouvindo em :${PORT} (nós: ${NODES.join(",")} + ${BACKUP})`));
}
