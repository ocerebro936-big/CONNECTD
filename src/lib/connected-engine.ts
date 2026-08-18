// ============================================================================
// Connected Cloud Core — base dos motores autónomos da Connected
// ----------------------------------------------------------------------------
// Padrão comum para todos os "motorzinhos" da plataforma. Cada motor executa
// tarefas pré-autorizadas e reporta saúde. Motores pesados (transcoding,
// thumbnails, backups reais) podem mais tarde mover-se para Cloud Functions;
// aqui orquestramos o que é possível no cliente + Firebase.
// ============================================================================

export interface EngineContext {
  engineId: string;
  startedAt: Date;
}

export interface EngineResult {
  success: boolean;
  message: string;
  durationMs: number;
}

export interface EngineHealth {
  id: string;
  lastRun: number;
  lastSuccess: boolean;
  lastMessage: string;
  lastDurationMs: number;
}

export abstract class ConnectedEngine {
  abstract readonly id: string;
  abstract readonly label: string;

  async run(context: EngineContext): Promise<EngineResult> {
    const started = Date.now();
    try {
      await this.execute(context);
      return {
        success: true,
        message: `${this.id} executado com sucesso`,
        durationMs: Date.now() - started,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `${this.id} falhou: ${error?.message || error}`,
        durationMs: Date.now() - started,
      };
    }
  }

  protected abstract execute(context: EngineContext): Promise<void>;
}

const HEALTH_KEY = 'connected.engines.health';

export function recordEngineHealth(id: string, result: EngineResult): void {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    const map: Record<string, EngineHealth> = raw ? JSON.parse(raw) : {};
    map[id] = {
      id,
      lastRun: Date.now(),
      lastSuccess: result.success,
      lastMessage: result.message,
      lastDurationMs: result.durationMs,
    };
    localStorage.setItem(HEALTH_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getEnginesHealth(): Record<string, EngineHealth> {
  try {
    return JSON.parse(localStorage.getItem(HEALTH_KEY) || '{}');
  } catch {
    return {};
  }
}

export class EngineRegistry {
  private engines: ConnectedEngine[] = [];

  register(e: ConnectedEngine): void {
    if (!this.engines.find((x) => x.id === e.id)) this.engines.push(e);
  }

  all(): ConnectedEngine[] {
    return this.engines;
  }

  async tick(): Promise<void> {
    for (const e of this.engines) {
      const r = await e.run({ engineId: e.id, startedAt: new Date() });
      recordEngineHealth(e.id, r);
    }
  }
}

export const engineRegistry = new EngineRegistry();
