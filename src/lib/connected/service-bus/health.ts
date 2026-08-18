// Service Bus — health engine: monitoriza o estado de cada serviço.
import { getService, listServices, type HealthStatus } from './registry';
import { emit } from './events';

export async function checkHealth(serviceId: string): Promise<HealthStatus> {
  const svc = getService(serviceId);
  if (!svc) return { status: 'down', detail: 'serviço inexistente', at: Date.now() };
  try {
    const h = await svc.health();
    if (h.status !== 'ok') emit('health:degraded', { service: serviceId, status: h });
    return h;
  } catch (e: any) {
    const down: HealthStatus = { status: 'down', detail: String(e?.message || e), at: Date.now() };
    emit('health:down', { service: serviceId, status: down });
    return down;
  }
}

export async function checkAll(): Promise<Record<string, HealthStatus>> {
  const out: Record<string, HealthStatus> = {};
  for (const svc of listServices()) out[svc.id] = await checkHealth(svc.id);
  return out;
}

export function summarize(health: Record<string, HealthStatus>) {
  const total = Object.keys(health).length;
  const down = Object.values(health).filter((h) => h.status === 'down').length;
  const degraded = Object.values(health).filter((h) => h.status === 'degraded').length;
  const ok = total - down - degraded;
  return { ok, degraded, down, total, healthy: down === 0 && degraded === 0 };
}
