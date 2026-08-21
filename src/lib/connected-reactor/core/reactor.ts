import { PriorityQueue } from "../queue/queue";
import type { ReactorTask } from "../queue/priority";
import { createTask } from "./task";
import { Scheduler } from "./scheduler";
import { ResourceMonitor } from "../resources/monitor";
import { evaluateReactorHealth, type ReactorHealth } from "../health/guardian";
import { reactorEvents, type ReactorEvent, type ReactorEventType } from "../events/reactor-events";
import type { WorkerContext, WorkerHandler } from "../workers/media.worker";
import { cloudGuardian } from "../../connected-cloud/node";
import { connectedRuntime } from "../../connected-runtime";

const MAX_ATTEMPTS = 3;

// ============================================================================
// Digital Reactor — núcleo de processamento e distribuição da Connected King.
// ----------------------------------------------------------------------------
// Orquestra tarefas (upload, media, manutenção) por prioridade, monitoriza
// recursos reais e emite eventos que alimentam o Economy Engine. O browser
// faz otimizações leves; o processamento pesado corre nos Cloud Nodes.
// ============================================================================
export class DigitalReactor {
  private queue = new PriorityQueue();
  private scheduler = new Scheduler(this.queue);
  private monitor: ResourceMonitor;
  private handlers = new Map<string, WorkerHandler>();
  private running = new Set<string>();
  private completed = 0;
  private failed = 0;
  private activeUploads = 0;
  private workersTotal: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  constructor(workersTotal?: number) {
    this.workersTotal =
      workersTotal ||
      (typeof navigator !== "undefined" && navigator.hardwareConcurrency) ||
      4;
    this.monitor = new ResourceMonitor(
      () => this.queue.size,
      () => this.running.size,
    );
    this.registerHandler("media.thumbnail", async () => ({ ok: true }));
    this.registerHandler("maintenance", async () => ({ ok: true }));
    reactorEvents.on((e) => {
      if (e.type === "upload_start") this.activeUploads += 1;
      else if (e.type === "upload_complete" || e.type === "upload_failed")
        this.activeUploads = Math.max(0, this.activeUploads - 1);
    });
  }

  registerHandler(type: string, handler: WorkerHandler): void {
    this.handlers.set(type, handler);
  }

  enqueue(input: {
    type: string;
    priority?: ReactorTask["priority"];
    payload?: any;
    ownerId?: string;
  }): ReactorTask {
    const task = createTask(input.type, {
      priority: input.priority,
      payload: input.payload,
      ownerId: input.ownerId,
    });
    task.status = "queued";
    this.queue.enqueue(task);
    this.pump();
    return task;
  }

  start(intervalMs = 500): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => this.pump(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }

  private pump(): void {
    while (this.running.size < this.workersTotal) {
      const task = this.scheduler.next();
      if (!task) break;
      this.run(task);
    }
    this.syncRuntime();
  }

  private async run(task: ReactorTask): Promise<void> {
    const handler = this.handlers.get(task.type);
    task.status = "running";
    task.attempts += 1;
    this.running.add(task.id);
    const t0 = Date.now();

    const ctx: WorkerContext = {
      emit: (e: ReactorEvent) => reactorEvents.emit(e),
    };

    try {
      if (!handler) throw new Error(`SEM_HANDLER:${task.type}`);
      const res = await handler(task, ctx);
      if (!res.ok) throw new Error("HANDLER_FAILED");
      task.status = "completed";
      this.completed += 1;
      this.monitor.noteLatency(Date.now() - t0);
    } catch (e: any) {
      task.status = "failed";
      this.failed += 1;
      if (task.attempts < MAX_ATTEMPTS && task.type !== "maintenance") {
        // reenfileira para retry (mesma prioridade)
        task.status = "queued";
        this.queue.enqueue(task);
      }
    } finally {
      this.running.delete(task.id);
    }
  }

  /** Encaminha eventos de operação para o Economy Engine (tráfego/receita). */
  bindEconomy(onEvent: (e: ReactorEvent) => void): () => void {
    return reactorEvents.on(onEvent);
  }

  metrics(): ReactorHealth {
    const resources = this.monitor.sample();
    const tasks = {
      queued: this.queue.size,
      running: this.running.size,
      completed: this.completed,
      failed: this.failed,
    };
    const workers = {
      total: this.workersTotal,
      running: this.running.size,
      idle: Math.max(0, this.workersTotal - this.running.size),
    };
    const nodeOffline =
      cloudGuardian.report().fleet.offline > 0;
    return evaluateReactorHealth({ resources, workers, tasks, nodeOffline });
  }

  summary() {
    const h = this.metrics();
    const r = h.resources;
    return {
      workers: h.workers.total,
      running: h.workers.running,
      queued: h.tasks.queued,
      completed: h.tasks.completed,
      failed: h.tasks.failed,
      cpuCores: r.cpuCores,
      memoryMb: r.jsHeapUsedMb,
      latencyMs: r.latencyMs,
      activeUploads: this.activeUploads,
      healthy: h.healthy,
      alerts: h.alerts,
    };
  }

  private syncRuntime(): void {
    const healthy = this.metrics().healthy;
    connectedRuntime.setStatus("ccs", healthy ? "ready" : "degraded");
  }
}

export const digitalReactor = new DigitalReactor();

// Tipos úteis para quem consome o Reactor.
export type { ReactorTask, ReactorEventType, ReactorEvent };
