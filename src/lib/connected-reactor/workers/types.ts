// Resultado padronizado de cada worker do Cloud Worker Engine.
export interface WorkerResult {
  ok: boolean;
  summary: string;
  metrics?: Record<string, any>;
}

// Contexto partilhado: permite emitir eventos para o Economy/Reactor.
export interface WorkerContext {
  emit: (e: any) => void;
}

export interface CloudWorker {
  id: string;
  intervalMs: number;
  run: (ctx: WorkerContext) => Promise<WorkerResult>;
}

// WorkerContext canónico (definido em media.worker) re-exportado para conveniência.
export type { WorkerContext as ReactorWorkerContext } from "./media.worker";
