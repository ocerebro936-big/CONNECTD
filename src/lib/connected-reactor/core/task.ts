import type { ReactorTask, TaskPriority } from "../queue/priority";

let counter = 0;

export function createTask(
  type: string,
  opts: {
    priority?: TaskPriority;
    payload?: any;
    ownerId?: string;
  } = {},
): ReactorTask {
  counter += 1;
  return {
    id: `task_${Date.now().toString(36)}_${counter}`,
    type,
    priority: opts.priority ?? 3,
    createdAt: Date.now(),
    attempts: 0,
    status: "queued",
    payload: opts.payload,
    ownerId: opts.ownerId,
  };
}
