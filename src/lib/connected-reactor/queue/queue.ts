import { comparePriority, type ReactorTask } from "./priority";

// Fila de tarefas com prioridade. Em memória (lado do cliente); o
// processamento pesado real corre nos Cloud Nodes (servidores).
export class PriorityQueue {
  private items: ReactorTask[] = [];

  get size(): number {
    return this.items.length;
  }

  enqueue(task: ReactorTask): void {
    this.items.push(task);
    this.items.sort(comparePriority);
  }

  dequeue(): ReactorTask | undefined {
    return this.items.shift();
  }

  peek(): ReactorTask | undefined {
    return this.items[0];
  }

  list(): ReactorTask[] {
    return this.items.slice();
  }

  remove(id: string): void {
    this.items = this.items.filter((t) => t.id !== id);
  }
}
