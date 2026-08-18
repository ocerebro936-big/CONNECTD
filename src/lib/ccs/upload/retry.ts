// ============================================================================
// Connected Cloud Storage — Retry com backoff exponencial
// Torna o upload resiliente a falhas de rede transitórias.
// ============================================================================

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 5;
  const baseDelay = opts.baseDelayMs ?? 700;
  const maxDelay = opts.maxDelayMs ?? 8000;
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      attempt++;
      if (attempt > retries) throw err;
      opts.onRetry?.(attempt, err);
      const delay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
