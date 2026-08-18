// ============================================================================
// Connected Cloud Storage — Upload resiliente (chunk + resume)
// O provider físico (Firebase/S3) faz o chunking nativo e a retomada. Aqui
// adicionamos: retry com backoff, relatório de progresso, cancelamento e
// persistência de sessão para retomar após interrupção.
// ============================================================================
import { connectedStorage } from '../../cloud-storage/provider';
import type { StorageObject } from '../../cloud-storage/provider';
import { withRetry } from './retry';
import { saveUploadSession, clearUploadSession, type UploadSession } from './resume';

export interface ResumableUploadOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  retries?: number;
}

export interface ResumableUploadHandle {
  promise: Promise<{ url: string; fileId: string }>;
  abort: () => void;
}

export function uploadResumable(
  object: StorageObject,
  data: Blob | ArrayBuffer,
  session: UploadSession,
  opts: ResumableUploadOptions = {}
): ResumableUploadHandle {
  const controller = new AbortController();
  if (opts.signal) opts.signal.addEventListener('abort', () => controller.abort());

  const promise = (async () => {
    saveUploadSession(session);
    try {
      const res = await withRetry(
        () =>
          connectedStorage.upload(object, data, (f) => {
            opts.onProgress?.(f);
          }),
        { retries: opts.retries ?? 5, signal: controller.signal, onRetry: () => {} }
      );
      return { url: res.url, fileId: res.fileId };
    } finally {
      clearUploadSession(session.assetId);
    }
  })();

  return { promise, abort: () => controller.abort() };
}
