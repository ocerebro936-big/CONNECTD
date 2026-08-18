// ============================================================================
// Connected Fast Engine — Task Queue (Workers)
// Fila de tarefas com concorrência limitada e prioridade. Usada para processar
// mídia, gerar derivados ou fazer prefetch em segundo plano, sem bloquear a UI.
// ============================================================================

export interface FastTask {
  id?: string;
  priority?: number;
  run: () => Promise<any>;
}

export class TaskQueue {
  private q: { task: FastTask; resolve: (v: any) => void; reject: (e: any) => void }[] = [];
  private active = 0;

  constructor(private concurrency = 4) {}

  add(task: FastTask): Promise<any> {
    return new Promise((resolve, reject) => {
      this.q.push({ task, resolve, reject });
      this.q.sort((a, b) => (b.task.priority ?? 0) - (a.task.priority ?? 0));
      this.pump();
    });
  }

  private pump() {
    if (this.active >= this.concurrency) return;
    const item = this.q.shift();
    if (!item) return;
    this.active++;
    Promise.resolve().then(async () => {
      try {
        const r = await item.task.run();
        item.resolve(r);
      } catch (e) {
        item.reject(e);
      } finally {
        this.active--;
        this.pump();
      }
    });
  }

  get size() {
    return this.q.length;
  }
  get running() {
    return this.active;
  }
}

export const mediaQueue = new TaskQueue(3);
export const prefetchQueue = new TaskQueue(6);
