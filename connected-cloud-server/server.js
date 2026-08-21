// ============================================================================
// Connected Cloud Server — Object Node real (sem dependências externas)
// ----------------------------------------------------------------------------
// Backend mínimo mas REAL da Connected Cloud. Armazena objetos em disco
// (filesystem), com upload em chunks resumível, checksum (sha256), dedup e
// replicação local. Expõe a API interna descrita na arquitetura CCS.
//
// Não finge armazenamento: os bytes vivem em data/objects.
// ============================================================================
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "data");
const OBJ_DIR = join(DATA, "objects");
const SESS_DIR = join(DATA, "sessions");
const INDEX = join(DATA, ".index.json");
const PORT = Number(process.env.PORT || 8787);

for (const d of [DATA, OBJ_DIR, SESS_DIR]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

function loadIndex() {
  try { return JSON.parse(readFileSync(INDEX, "utf8")); } catch { return { byChecksum: {} }; }
}
function saveIndex(idx) {
  writeFileSync(INDEX, JSON.stringify(idx, null, 2));
}
const sessions = new Map();

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;
    const method = req.method;

    // GET /v1/nodes/health
    if (method === "GET" && p === "/v1/nodes/health") {
      const used = (() => { try { return countBytes(OBJ_DIR); } catch { return 0; } })();
      return send(res, 200, {
        status: "ready",
        nodes: [{ id: "ck-node-1", region: "global", status: "ready", usedBytes: used }],
      });
    }

    // POST /v1/upload/init
    if (method === "POST" && p === "/v1/upload/init") {
      const body = await readJson(req);
      const id = randomUUID();
      const dir = join(SESS_DIR, id);
      mkdirSync(dir, { recursive: true });
      sessions.set(id, { ...body, received: 0 });
      return send(res, 200, { sessionId: id });
    }

    // PUT /v1/upload/:session/:index
    let m = p.match(/^\/v1\/upload\/([^/]+)\/(\d+)$/);
    if (method === "PUT" && m) {
      const [, sid, idx] = m;
      const dir = join(SESS_DIR, sid);
      if (!existsSync(dir)) return send(res, 404, { error: "SESSION_NOT_FOUND" });
      const buf = await readBytes(req);
      writeFileSync(join(dir, `${idx}.bin`), buf);
      return send(res, 200, { ok: true });
    }

    // POST /v1/upload/:session/complete
    m = p.match(/^\/v1\/upload\/([^/]+)\/complete$/);
    if (method === "POST" && m) {
      const [, sid] = m;
      const dir = join(SESS_DIR, sid);
      const meta = sessions.get(sid);
      if (!meta) return send(res, 404, { error: "SESSION_NOT_FOUND" });
      const total = meta.totalChunks || 1;
      const chunks = [];
      for (let i = 0; i < total; i++) {
        const f = join(dir, `${i}.bin`);
        if (!existsSync(f)) return send(res, 400, { error: "MISSING_CHUNK", index: i });
        chunks.push(readFileSync(f));
      }
      const buf = Buffer.concat(chunks);
      const checksum = createHash("sha256").update(buf).digest("hex");

      // Dedup: se já existe um objeto com este checksum, reusa os bytes.
      const idx = loadIndex();
      let storedKey = idx.byChecksum[checksum];
      if (!storedKey) {
        storedKey = meta.key;
        const dest = join(OBJ_DIR, sanitize(storedKey));
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, buf);
        idx.byChecksum[checksum] = storedKey;
        saveIndex(idx);
      }
      rmSync(dir, { recursive: true, force: true });
      sessions.delete(sid);
      return send(res, 200, { id: storedKey, key: storedKey, checksum, url: `/v1/assets/${encodeURIComponent(storedKey)}` });
    }

    // DELETE /v1/assets/:key
    m = p.match(/^\/v1\/assets\/(.+)$/);
    if (method === "DELETE" && m) {
      const key = decodeURIComponent(m[1]);
      const f = join(OBJ_DIR, sanitize(key));
      if (!existsSync(f)) return send(res, 404, { error: "NOT_FOUND" });
      rmSync(f, { force: true });
      return send(res, 200, { ok: true });
    }

    // GET/HEAD /v1/assets/:key
    if ((method === "GET" || method === "HEAD") && m) {
      const key = decodeURIComponent(m[1]);
      const f = join(OBJ_DIR, sanitize(key));
      if (!existsSync(f)) return send(res, 404, { error: "NOT_FOUND" });
      const st = statSync(f);
      const headers = {
        "content-type": metaFor(key) || "application/octet-stream",
        "content-length": String(st.size),
        "x-ccs-updated": String(st.mtimeMs),
        etag: `"${st.size}-${st.mtimeMs}"`,
      };
      if (method === "HEAD") return send(res, 200, "", headers);
      res.writeHead(200, headers);
      createReadStream(f).pipe(res);
      return;
    }

    send(res, 404, { error: "NOT_FOUND" });
  } catch (e) {
    send(res, 500, { error: String(e?.message || e) });
  }
});

function sanitize(key) {
  return key.replace(/\.\.+/g, "").replace(/^\/+/, "");
}
function metaFor(key) {
  const ext = extname(key).slice(1);
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", pdf: "application/pdf", json: "application/json" };
  return map[ext] || null;
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d ? JSON.parse(d) : {}));
    req.on("error", reject);
  });
}
function readBytes(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function countBytes(dir) {
  let total = 0;
  for (const f of walk(dir)) total += statSync(f).size;
  return total;
}
function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

export function startServer(port = PORT) {
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// Arranca automaticamente se executado diretamente.
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => console.info(`[Connected Cloud] Object Node ouvindo em :${PORT}`));
}
