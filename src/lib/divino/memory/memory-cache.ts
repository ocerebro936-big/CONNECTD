// Cache de memória recuperada (TTL). Evita recomputar recall repetido
// na mesma sessão de raciocínio.
interface CacheItem {
  value: unknown;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 60_000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
