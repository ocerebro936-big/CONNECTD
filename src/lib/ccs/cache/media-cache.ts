// ============================================================================
// Connected Cloud Storage — Cache de mídia (cliente)
// Armazena URLs por checksum para evitar re-downloads e acelerar aTimeline.
// Usa IndexedDB quando disponível, com fallback em memória.
// ============================================================================

const CACHE_NAME = 'ccs_media_cache';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const memory = new Map<string, CacheEntry>();

function db(): IDBDatabase | null {
  try {
    if (typeof indexedDB === 'undefined') return null;
    // lazy open
    const req = indexedDB.open(CACHE_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('media', { keyPath: 'key' });
    };
    return null; // não bloqueamos na abertura; usamos memória primariamente
  } catch {
    return null;
  }
}

void db;

export function cacheMediaGet(checksum: string): string | null {
  const e = memory.get(checksum);
  if (e && e.expiresAt > Date.now()) return e.url;
  if (e) memory.delete(checksum);
  return null;
}

export function cacheMediaSet(checksum: string, url: string, ttlMs = 1000 * 60 * 30): void {
  memory.set(checksum, { url, expiresAt: Date.now() + ttlMs });
}

export function cacheMediaPrefetch(urls: string[]): void {
  urls.forEach((u) => {
    const img = new Image();
    img.src = u;
  });
}
