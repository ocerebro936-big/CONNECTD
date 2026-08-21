import type { ResourceSample } from "../resources/monitor";

export interface ReactorAlert {
  level: "info" | "warn" | "critical";
  code: string;
  message: string;
}

export interface ReactorHealth {
  healthy: boolean;
  alerts: ReactorAlert[];
  resources: ResourceSample;
  workers: { total: number; running: number; idle: number };
  tasks: { queued: number; running: number; completed: number; failed: number };
}

// Guardian do Reactor: monitoriza fila, latência, workers e nós.
export function evaluateReactorHealth(input: {
  resources: ResourceSample;
  workers: { total: number; running: number; idle: number };
  tasks: { queued: number; running: number; completed: number; failed: number };
  nodeOffline: boolean;
}): ReactorHealth {
  const alerts: ReactorAlert[] = [];
  const { resources, workers, tasks, nodeOffline } = input;

  if (nodeOffline) {
    alerts.push({ level: "critical", code: "NODE_OFFLINE", message: "Cloud Node offline." });
  }
  if (resources.queued > 50) {
    alerts.push({ level: "warn", code: "QUEUE_HIGH", message: `Fila elevada (${resources.queued} tarefas).` });
  }
  if (resources.latencyMs && resources.latencyMs > 800) {
    alerts.push({ level: "warn", code: "LATENCY_HIGH", message: `Latência elevada (${resources.latencyMs}ms).` });
  }
  if (workers.total > 0 && workers.idle === 0 && resources.queued > 0) {
    alerts.push({ level: "info", code: "WORKERS_BUSY", message: "Workers ocupados; tarefas a aguardar." });
  }
  if (tasks.failed > 0) {
    alerts.push({ level: "warn", code: "TASK_FAILURES", message: `${tasks.failed} tarefa(s) falharam.` });
  }

  return {
    healthy: !alerts.some((a) => a.level === "critical"),
    alerts,
    resources,
    workers,
    tasks,
  };
}
