// ============================================================================
// Connected Fast Engine — Cache (memória + IndexedDB)
// Cache genérico com TTL, namespaced. Usado para posts, perfis e mídia, para
// que o Feed possa pintar instantaneamente a partir do cache antes do live.
// ============================================================================

export class FastCache {
  private ns: string;
  private mem = new Map<string, { v: any; exp: number }>();
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(namespace: string) {
    this.ns = namespace;
  }

  private k(key: string) {
    return `${this.ns}:${key}`;
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('no-idb'));
        return;
      }
      const req = indexedDB.open('connected_fast_engine', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    const m = this.mem.get(key);
    if (m) {
      if (m.exp > Date.now()) return m.v as T;
      this.mem.delete(key);
    }
    try {
      const db = await this.openDb();
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const rec = await new Promise<any>((res, rej) => {
        const r = store.get(this.k(key));
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      if (rec && rec.exp > Date.now()) {
        this.mem.set(key, { v: rec.value, exp: rec.exp });
        return rec.value as T;
      }
    } catch {
      /* cache indisponível */
    }
    return null;
  }

  async set(key: string, value: any, ttlMs = 5 * 60 * 1000): Promise<void> {
    const exp = Date.now() + ttlMs;
    this.mem.set(key, { v: value, exp });
    try {
      const db = await this.openDb();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ key: this.k(key), value, exp });
    } catch {
      /* cache indisponível */
    }
  }

  async delete(key: string): Promise<void> {
    this.mem.delete(key);
    try {
      const db = await this.openDb();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(this.k(key));
    } catch {
      /* ignore */
    }
  }
}

export const feedCache = new FastCache('feed');
export const profileCache = new FastCache('profile');
export const mediaCache = new FastCache('media');
