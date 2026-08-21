export interface CacheEntry {
  value: Uint8Array;
  expiresAt: number;
}

export interface CacheEngine {
  get(key: string): Promise<Uint8Array | null>;
  set(
    key: string,
    value: Uint8Array,
    ttlMs?: number,
  ): Promise<void>;
  delete(key: string): Promise<void>;
  stats(): { size: number };
}

export class MemoryCacheEngine
  implements CacheEngine {

  private cache =
    new Map<string, CacheEntry>();

  async get(key: string) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (
      entry.expiresAt &&
      Date.now() > entry.expiresAt
    ) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: Uint8Array,
    ttlMs = 5 * 60 * 1000,
  ) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string) {
    this.cache.delete(key);
  }

  stats() {
    return { size: this.cache.size };
  }
}
