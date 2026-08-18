// Service Bus — event bus (pub/sub) para comunicação serviço-a-serviço.
export type BusHandler = (event: { type: string; payload?: any }) => void;

const handlers = new Map<string, Set<BusHandler>>();

export function on(eventType: string, handler: BusHandler): () => void {
  if (!handlers.has(eventType)) handlers.set(eventType, new Set());
  handlers.get(eventType)!.add(handler);
  return () => handlers.get(eventType)?.delete(handler);
}

export function emit(eventType: string, payload?: any): void {
  handlers.get(eventType)?.forEach((h) => {
    try {
      h({ type: eventType, payload });
    } catch {
      /* handler falhou — isolado */
    }
  });
}
