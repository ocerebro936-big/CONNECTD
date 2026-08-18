// ============================================================================
// Connected Fast Engine — Media Worker
// Gera derivados de imagem num Web Worker (OffscreenCanvas) para não bloquear
// a thread principal durante o upload/processamento de mídia.
// ============================================================================

export interface WorkerDerivativeRequest {
  id: string;
  blob: Blob;
  targets: { label: string; width: number }[];
  quality?: number;
}

export interface WorkerDerivativeResult {
  id: string;
  derivatives: { label: string; width: number; blob: Blob }[];
}

export function createMediaWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./media.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}
