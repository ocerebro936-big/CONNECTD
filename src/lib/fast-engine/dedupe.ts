// ============================================================================
// Connected Fast Engine — Request Deduplication
// Memoiza Promises por chave para não repetir leituras (Firestore / asset /
// thumbnail) idênticas em voo. Útil para o Feed e para metadados de mídia.
// ============================================================================

const inflight = new Map<string, Promise<any>>();

export function dedupe<T>(key: string, factory: () => Promise<T>, ttlMs = 30000): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = factory().finally(() => {
    // limpa após a conclusão (mantém cache de resultado em FastCache, se usado)
    setTimeout(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    }, ttlMs);
  });
  inflight.set(key, p);
  return p;
}

export function clearDedupe(key?: string) {
  if (key) inflight.delete(key);
  else inflight.clear();
}
