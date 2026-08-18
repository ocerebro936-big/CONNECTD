// Connected Gateway — ponto único de orquestração dos serviços.
// Aplica política + auditoria + roteamento através do Service Bus.
import { route, type ServiceResult } from '../service-bus/router';
import { checkAll, summarize } from '../service-bus/health';
import { recordAudit } from '../audit';
import { getAuth } from 'firebase/auth';

export interface GatewayContext {
  actor?: string;
  role?: string;
}

// Ações que exigem papel elevado (não são públicas).
const RESTRICTED: Record<string, string[]> = {
  cloud: ['inspect'],
};

function authorized(serviceId: string, action: string, ctx: GatewayContext): boolean {
  const needed = RESTRICTED[serviceId]?.includes(action);
  if (!needed) return true;
  return ctx.role === 'admin' || ctx.role === 'superadmin' || ctx.role === 'moderator';
}

export async function invoke(
  serviceId: string,
  action: string,
  payload: any = {},
  ctx: GatewayContext = {},
): Promise<ServiceResult> {
  const actor = ctx.actor || getAuth().currentUser?.uid || 'system';
  if (!authorized(serviceId, action, ctx)) {
    recordAudit({ actor, action, service: serviceId, resource: action, result: 'denied' });
    return { service: serviceId, action, ok: false, error: 'sem permissão (política)' };
  }
  const res = await route(serviceId, action, payload);
  recordAudit({
    actor,
    action,
    service: serviceId,
    resource: action,
    result: res.ok ? 'ok' : 'error',
    detail: res.error,
  });
  return res;
}

// Varre a saúde de todos os serviços (usado pelo Divino em diagnósticos).
export async function diagnoseAll(actor = 'system'): Promise<{ summary: any; health: Record<string, any> }> {
  const health = await checkAll();
  const summary = summarize(health);
  recordAudit({ actor, action: 'DIAGNOSTICS', service: 'gateway', resource: 'all', result: summary.healthy ? 'ok' : 'error' });
  return { summary, health };
}

// Orquestra um plano (sequência de passos) através do barramento.
export async function runOrchestration(
  steps: { service: string; action: string; payload?: any }[],
  actor = 'system',
  role = 'system',
): Promise<ServiceResult[]> {
  const results: ServiceResult[] = [];
  for (const s of steps) {
    results.push(await invoke(s.service, s.action, s.payload || {}, { actor, role }));
  }
  recordAudit({
    actor,
    action: 'ORCHESTRATION',
    service: 'gateway',
    resource: `${steps.length} passos`,
    result: results.every((r) => r.ok) ? 'ok' : 'error',
  });
  return results;
}
