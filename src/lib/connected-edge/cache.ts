// Edge Cache — TTL + ETag + invalidação. Cache em memória (funciona em
// browser e em testes); respeita política de visibilidade (conteúdo não
// público não é colocado aqui).
interface CacheEntry {
  buf: Uint8Array;
  etag?: string;
  exp: number;
}

export class EdgeCache {
  private m = new Map<string, CacheEntry>();
  hits = 0;
  misses = 0;
  private maxEntries = 2000;

  get(key: string): CacheEntry | null {
    const e = this.m.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { this.m.delete(key); return null; }
    return e;
  }

  set(key: string, buf: Uint8Array, etag: string | undefined, ttlSeconds: number): void {
    if (this.m.size >= this.maxEntries) this.prune();
    this.m.set(key, { buf, etag, exp: Date.now() + ttlSeconds * 1000 });
  }

  hit() { this.hits++; }
  miss() { this.misses++; }

  invalidate(key: string) { this.m.delete(key); }
  invalidatePrefix(prefix: string) {
    for (const k of [...this.m.keys()]) if (k.startsWith(prefix)) this.m.delete(k);
  }

  stats() {
    let bytes = 0;
    for (const e of this.m.values()) bytes += e.buf.byteLength;
    const total = this.hits + this.misses;
    return {
      entries: this.m.size,
      bytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? Math.round((this.hits / total) * 100) : 0,
    };
  }

  prune() {
    const now = Date.now();
    for (const [k, e] of [...this.m.entries()]) if (now > e.exp) this.m.delete(k);
  }
}

export const edgeCache = new EdgeCache();
