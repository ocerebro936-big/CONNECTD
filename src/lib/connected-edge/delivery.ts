// ============================================================================
// Edge Delivery — entrega conteúdo via cache inteligente + Node selecionado
// pelo Global Node Manager (#20) + adaptive media + política de visibilidade.
// Alimenta o Traffic Meter (plataforma), nunca dinheiro do utilizador.
// ============================================================================
import { edgeCache } from "./cache";
import { adaptiveTier } from "./adaptive";
import type { AdaptiveTier, EdgeDeliveryResult, EdgeVisibility, EdgeCachePolicy, DeliveryTrace } from "./types";
import { globalNodeManager } from "../connected-cloud/global/manager";
import { cloudGateway } from "../connected-reactor/gateway";
import { recordUsage } from "../economy/traffic";

const MAX_CACHE_BYTES = 20 * 1024 * 1024;

function policyFor(v: EdgeVisibility): EdgeCachePolicy {
  switch (v) {
    case "public": return { cacheable: true, requireAuth: false, ttlSeconds: 300 };
    case "followers": return { cacheable: false, requireAuth: true, ttlSeconds: 60 };
    case "friends": return { cacheable: false, requireAuth: true, ttlSeconds: 60 };
    case "private": return { cacheable: false, requireAuth: true, ttlSeconds: 30 };
    case "admin": return { cacheable: false, requireAuth: true, ttlSeconds: 10 }; // nunca público
    default: return { cacheable: true, requireAuth: false, ttlSeconds: 300 };
  }
}

const traces: DeliveryTrace[] = [];
function pushTrace(t: DeliveryTrace) { traces.unshift(t); if (traces.length > 25) traces.pop(); }

export interface DeliverOptions {
  key: string;
  visibility?: EdgeVisibility;
  tier?: AdaptiveTier;
  ownerId?: string;
  assetId?: string;
}

export async function deliverAsset(opts: DeliverOptions): Promise<EdgeDeliveryResult> {
  const vis = opts.visibility || "public";
  const policy = policyFor(vis);
  const tier = opts.tier || adaptiveTier();
  const cacheKey = opts.key + (tier !== "original" ? `:${tier}` : "");

  // 1) Edge Cache (apenas conteúdo público)
  if (policy.cacheable) {
    const cached = edgeCache.get(cacheKey);
    if (cached) {
      edgeCache.hit();
      return { ok: true, source: "cache", cacheStatus: "HIT", latencyMs: 0, bytes: cached.buf.byteLength, etag: cached.etag, url: opts.key };
    }
  }
  edgeCache.miss();

  // 2) Node selecionado pelo Global Node Manager (#20) — sem lógica paralela
  const best = globalNodeManager.bestEndpoint();
  const base = best?.baseUrl || cloudGateway.base;
  let url = `${base}/v1/assets/${encodeURIComponent(opts.key)}`;

  // 3) URL assinada para conteúdo autorizado
  if (policy.requireAuth) {
    try {
      const s = await fetch(`${base}/v1/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: opts.key, exp: Date.now() + 120_000 }),
      });
      const j = await s.json();
      if (j.url) url = base + j.url;
    } catch { /* fallback para GET direto */ }
  }

  // 4) Entrega (com ETag/If-None-Match tratado pelo servidor)
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: policy.cacheable ? {} : {} });
  } catch (e: any) {
    return { ok: false, source: "node", cacheStatus: "REMOTE", latencyMs: Date.now() - t0, bytes: 0, url };
  }
  const latency = Date.now() - t0;
  if (!res.ok) {
    pushTrace({ key: opts.key, tier, cacheStatus: "REMOTE", nodeId: best?.id, region: best?.region, latencyMs: latency, bytes: 0, at: Date.now(), note: `Falhou (${res.status})` });
    return { ok: false, source: "node", cacheStatus: "REMOTE", latencyMs: latency, bytes: 0, url };
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  const etag = res.headers.get("etag") || undefined;

  // 5) Armazena no Edge Cache (se aplicável) e mede tráfego da plataforma
  if (policy.cacheable && buf.length <= MAX_CACHE_BYTES) edgeCache.set(cacheKey, buf, etag, policy.ttlSeconds);
  if (opts.ownerId) recordUsage({ userId: opts.ownerId, assetId: opts.key, downloadBytes: buf.length }).catch(() => {});

  const note = policy.requireAuth ? "conteúdo autorizado (URL assinada)" : `entregue do Node ${best?.id || "?"} (${best?.region || "?"})`;
  pushTrace({ key: opts.key, tier, cacheStatus: "MISS", nodeId: best?.id, region: best?.region, latencyMs: latency, bytes: buf.length, at: Date.now(), note });
  return { ok: true, source: policy.requireAuth ? "signed" : "node", cacheStatus: "MISS", nodeId: best?.id, region: best?.region, latencyMs: latency, bytes: buf.length, etag, url };
}

export function getDeliveryTrace() { return [...traces]; }
