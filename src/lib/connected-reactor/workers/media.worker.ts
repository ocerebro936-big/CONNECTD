import type { ReactorTask } from "../queue/priority";
import type { ReactorEvents } from "../events/reactor-events";

// Contexto partilhado passado aos handlers de worker.
export interface WorkerContext {
  emit: (e: Parameters<ReactorEvents["emit"]>[0]) => void;
}

export type WorkerHandler = (
  task: ReactorTask,
  ctx: WorkerContext,
) => Promise<{ ok: boolean; result?: any }>;

// ============================================================================
// Media Worker (lado do cliente) — otimizações leves permitidas no browser:
// gera thumbnail/versões via canvas. O processamento pesado (transcoding de
// vídeo, etc.) corre nos Cloud Nodes (servidores), não aqui.
// ============================================================================
export const mediaWorker: WorkerHandler = async (task, ctx) => {
  const blob: Blob | undefined = task.payload?.blob;
  if (!blob || !blob.type.startsWith("image/")) {
    return { ok: false };
  }
  const bitmap = await createImageBitmap(blob);
  const size = task.payload?.thumbSize || 256;
  const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  if (!c) return { ok: false };
  c.drawImage(bitmap, 0, 0, w, h);
  const thumb = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.8));
  ctx.emit({ type: "storage", ownerId: task.ownerId, bytes: thumb?.size, taskId: task.id, at: Date.now() });
  return { ok: !!thumb, result: { thumbnail: thumb, width: w, height: h } };
};

// Upload e Maintenance Workers encontram-se em upload.worker.ts e
// maintenance.worker.ts respetivamente (estrutura do Reactor).

