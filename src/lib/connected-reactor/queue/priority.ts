// Fila de prioridade do Reactor (FIFO estável por prioridade).
export type TaskPriority = 1 | 2 | 3 | 4 | 5; // 5 = mais alto

export interface ReactorTask {
  id: string;
  type: string;
  priority: TaskPriority;
  createdAt: number;
  attempts: number;
  status: "queued" | "running" | "completed" | "failed";
  payload?: any;
  ownerId?: string;
  enqueuedAt?: number;
}

export function comparePriority(a: ReactorTask, b: ReactorTask): number {
  // maior prioridade primeiro; em empate, mais antigo primeiro
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.createdAt - b.createdAt;
}
