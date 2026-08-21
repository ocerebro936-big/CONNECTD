import type { ReactorTask } from "../queue/priority";
import type { WorkerContext, WorkerHandler } from "./media.worker";

// ============================================================================
// Upload Worker — orquestra o upload através do caminho oficial (Connected
// Cloud Gateway). Não há Firebase Storage. Em falha, o erro é explícito.
// ============================================================================
export const uploadWorker: WorkerHandler = async (task, ctx) => {
  const { connectedStorage } = await import("../../cloud-storage/provider");
  const { fileChecksum } = await import("../../cloud-storage/checksum");
  const { checkQuota } = await import("../../cloud-storage/quota-engine");

  const { key, ownerId, mimeType, visibility, file } = task.payload || {};
  if (!file || !ownerId) return { ok: false };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const checksum = await fileChecksum(file);
  const quota = await checkQuota(ownerId, bytes.byteLength, task.payload?.user ?? { uid: ownerId }).catch(() => ({ ok: true }));
  if (quota && quota.ok === false) {
    return { ok: false };
  }

  const url = await connectedStorage.upload(
    { id: key, ownerId, key, mimeType, size: bytes.byteLength, checksum, visibility },
    file,
    (f) => {
      if (task.payload?.onProgress) task.payload.onProgress(f);
    },
  );
  ctx.emit({ type: "upload", ownerId, bytes: bytes.byteLength, taskId: task.id, at: Date.now() });
  return { ok: !!url, result: { url } };
};
