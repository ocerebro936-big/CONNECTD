// ============================================================================
// Connected Edge/CDN Engine — tipos
// ----------------------------------------------------------------------------
// O Edge entrega conteúdo rapidamente (cache + adaptive media + seleção de
// Node via Global Node Manager #20). Conteúdo privado NUNCA entra no cache
// público; conteúdo autorizado usa URL assinada.
// ============================================================================
export type EdgeVisibility = "public" | "followers" | "friends" | "private" | "admin";
export type AdaptiveTier = "original" | "large" | "medium" | "small" | "thumbnail";

export interface EdgeCachePolicy {
  cacheable: boolean;     // entra no cache público?
  requireAuth: boolean;   // precisa de URL assinada (autenticado)?
  ttlSeconds: number;
}

export interface EdgeDeliveryResult {
  ok: boolean;
  source: "cache" | "node" | "signed";
  cacheStatus: "HIT" | "MISS" | "REMOTE";
  nodeId?: string;
  region?: string;
  latencyMs: number;
  bytes: number;
  etag?: string;
  url: string;
}

export interface DeliveryTrace {
  key: string;
  tier: AdaptiveTier;
  cacheStatus: string;
  nodeId?: string;
  region?: string;
  latencyMs: number;
  bytes: number;
  at: number;
  note: string;
}
