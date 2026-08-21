// ============================================================================
// Reactor Events — eventos de operação que alimentam o Connected Economy.
// ----------------------------------------------------------------------------
// Cada operação relevante (upload/download/stream/processing/storage/game/
// advertisement) emite um evento real. O Reactor subscreve e encaminha para
// o Economy Engine (custos, tráfego, receita). Sem invenções.
// ============================================================================

export type ReactorEventType =
  | "upload"
  | "upload_start"
  | "upload_complete"
  | "upload_failed"
  | "download"
  | "stream"
  | "video_processing"
  | "media_processed"
  | "replicate"
  | "backup"
  | "cleanup"
  | "storage"
  | "game"
  | "advertisement";

export interface ReactorEvent {
  type: ReactorEventType;
  ownerId?: string;
  bytes?: number;
  taskId: string;
  at: number;
}

type Listener = (e: ReactorEvent) => void;

export class ReactorEvents {
  private listeners = new Set<Listener>();

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: ReactorEvent): void {
    this.listeners.forEach((l) => l(e));
  }
}

export const reactorEvents = new ReactorEvents();
