import type { PriorityQueue } from "../queue/queue";
import type { ReactorTask } from "../queue/priority";

// Scheduler: retira a próxima tarefa (já ordenada por prioridade na fila).
export class Scheduler {
  constructor(private queue: PriorityQueue) {}

  next(): ReactorTask | undefined {
    return this.queue.dequeue();
  }

  peek(): ReactorTask | undefined {
    return this.queue.peek();
  }
}
