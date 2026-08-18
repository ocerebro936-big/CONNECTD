// Service Bus — router: encaminha uma ação para o serviço correto.
import { getService, type ConnectedService } from './registry';

export interface ServiceResult {
  service: string;
  action: string;
  ok: boolean;
  data?: any;
  error?: string;
}

export async function route(serviceId: string, action: string, payload: any = {}): Promise<ServiceResult> {
  const svc: ConnectedService | undefined = getService(serviceId);
  if (!svc) return { service: serviceId, action, ok: false, error: 'serviço desconhecido' };
  const fn = svc.actions[action];
  if (!fn) return { service: serviceId, action, ok: false, error: 'ação não suportada' };
  try {
    const data = await fn(payload);
    return { service: serviceId, action, ok: true, data };
  } catch (e: any) {
    return { service: serviceId, action, ok: false, error: String(e?.message || e) };
  }
}
