import type { ServiceListener } from "./services";

export type RuntimeEvent =
  | { type: "service:status"; id: string }
  | { type: "runtime:ready" }
  | { type: "runtime:degraded" };

type EventHandler = (event: RuntimeEvent) => void;

// Barramento de eventos leve do runtime (sem dependências externas).
export class RuntimeEvents {
  private handlers = new Set<EventHandler>();

  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: RuntimeEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
