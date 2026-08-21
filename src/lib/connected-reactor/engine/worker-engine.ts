// ============================================================================
// Cloud Worker Engine — o "sistema operativo" da Connected Cloud.
// ----------------------------------------------------------------------------
// Orquestra os 7 workers reais (Media, Upload, Replication, Backup, Cleanup,
// Traffic, Health), cada um na sua cadência, e guarda o último resultado para
// a supervisão DIVINO e para o Cloud Control Center (PR #22).
// ============================================================================
import { reactorEvents } from "../events/reactor-events";
import type { CloudWorker, WorkerResult } from "../workers/types";
import { mediaCloudWorker } from "../workers/media.worker.engine";
import { uploadCloudWorker } from "../workers/upload.worker.engine";
import { replicationCloudWorker } from "../workers/replication.worker.engine";
import { backupCloudWorker } from "../workers/backup.worker.engine";
import { cleanupCloudWorker } from "../workers/cleanup.worker.engine";
import { trafficCloudWorker } from "../workers/traffic.worker.engine";
import { healthCloudWorker } from "../workers/health.worker.engine";

const EMIT = (e: any) => reactorEvents.emit(e);

export class WorkerEngine {
  private workers: CloudWorker[] = [
    mediaCloudWorker,
    uploadCloudWorker,
    replicationCloudWorker,
    backupCloudWorker,
    cleanupCloudWorker,
    trafficCloudWorker,
    healthCloudWorker,
  ];
  private last = new Map<string, WorkerResult>();
  private timers: Array<ReturnType<typeof setInterval>> = [];
  private started = false;

  results(): Record<string, WorkerResult> {
    const out: Record<string, WorkerResult> = {};
    for (const [k, v] of this.last) out[k] = v;
    return out;
  }
  get(id: string): WorkerResult | undefined { return this.last.get(id); }

  private tick(w: CloudWorker) {
    w.run({ emit: EMIT })
      .then((r) => this.last.set(w.id, r))
      .catch((e) => this.last.set(w.id, { ok: false, summary: String(e?.message || e) }));
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const w of this.workers) {
      this.tick(w);
      const t = setInterval(() => this.tick(w), w.intervalMs);
      if (typeof (t as any).unref === "function") (t as any).unref();
      this.timers.push(t);
    }
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.started = false;
  }
}

export const cloudWorkerEngine = new WorkerEngine();
