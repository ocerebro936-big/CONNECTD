import { digitalReactor } from "./core/reactor";
import { mediaWorker } from "./workers/media.worker";
import { uploadWorker } from "./workers/upload.worker";
import { maintenanceWorker } from "./workers/maintenance.worker";
import { cloudWorkerEngine } from "./engine/worker-engine";
import { recordUsage } from "../economy/traffic";
import type { ReactorEvent } from "./events/reactor-events";

// Regista os handlers reais dos workers.
digitalReactor.registerHandler("media.thumbnail", mediaWorker);
digitalReactor.registerHandler("upload", uploadWorker);
digitalReactor.registerHandler("maintenance", maintenanceWorker);

// Encaminha eventos de operação para o Connected Economy Engine.
digitalReactor.bindEconomy((e: ReactorEvent) => {
  if (!e.ownerId) return;
  try {
    recordUsage({
      userId: e.ownerId,
      assetId: e.taskId,
      uploadBytes: e.bytes || 0,
    });
  } catch {
    /* economia indisponível — não bloqueia o Reactor */
  }
});

export function startReactor(): void {
  digitalReactor.start();
  cloudWorkerEngine.start();
}

export function getReactorStatus() {
  const s = digitalReactor.summary();
  const parts = [
    `Workers: ${s.workers}`,
    `Running: ${s.running}`,
    `Queued: ${s.queued}`,
    `Failed: ${s.failed}`,
    `CPU: ${s.cpuCores ?? "n/a"}`,
    `Memory: ${s.memoryMb ?? "n/a"}MB`,
    `Latency: ${s.latencyMs ?? "n/a"}ms`,
  ];
  const summary = s.healthy
    ? `O Reactor está operacional. ${parts.join(", ")}.`
    : `O Reactor tem alertas: ${s.alerts.map((a) => a.message).join("; ")}`;
  return { ok: true, summary, data: s };
}

export * from "./core/reactor";
export * from "./queue/priority";
export * from "./queue/queue";
export * from "./events/reactor-events";
export { digitalReactor };
