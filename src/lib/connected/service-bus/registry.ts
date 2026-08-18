// ============================================================================
// Connected King Global Cloud — Service Bus (registry)
// ----------------------------------------------------------------------------
// Cada serviço da Connected expõe uma interface comum. O Divino e o Gateway
// orquestram através deste barramento, sem acoplar à infraestrutura física.
// ============================================================================
export type HealthStatusLevel = 'ok' | 'degraded' | 'down';

export interface HealthStatus {
  status: HealthStatusLevel;
  detail?: string;
  at: number;
}

export interface ConnectedService {
  id: string;
  name: string;
  description: string;
  health(): Promise<HealthStatus>;
  actions: Record<string, (payload: any) => Promise<any>>;
}

const services = new Map<string, ConnectedService>();

export function registerService(s: ConnectedService): void {
  services.set(s.id, s);
}

export function getService(id: string): ConnectedService | undefined {
  return services.get(id);
}

export function listServices(): ConnectedService[] {
  return Array.from(services.values());
}
