// DIVINO IA — ferramenta de orquestração global (usa o Connected Service Bus).
import { globalCloud } from '../../connected';

export interface DivinoOrchestrationResult {
  ok: boolean;
  summary: any;
  report: string;
  results?: any[];
}

// O Divino faz um diagnóstico completo da plataforma.
export async function connectedDiagnose(actor = 'divino'): Promise<DivinoOrchestrationResult> {
  const { summary, health } = await globalCloud.diagnoseAll(actor);
  const lines = Object.entries(health).map(([id, h]: any) => `  • ${id}: ${h.status}${h.detail ? ` (${h.detail})` : ''}`);
  return {
    ok: summary.healthy,
    summary,
    report: `Diagnóstico Connected King:\n${lines.join('\n')}\nResultado: ${summary.healthy ? 'TUDO OPERACIONAL 🟢' : 'ATENÇÃO ⚠️'}`,
  };
}

// O Divino coordena um plano de preparação (ex.: evento com muitos utilizadores).
export async function connectedOrchestrate(actor = 'divino', role = 'system'): Promise<DivinoOrchestrationResult> {
  const steps = [
    { service: 'cloud', action: 'provider' },
    { service: 'social', action: 'stats' },
    { service: 'games', action: 'players' },
    { service: 'tv', action: 'viewers' },
    { service: 'analytics', action: 'summary' },
  ];
  const results = await globalCloud.runOrchestration(steps, actor, role);
  const ok = results.every((r) => r.ok);
  return {
    ok,
    results,
    summary: { steps: results.length, ok },
    report: `Orquestração Connected King (${results.length} serviços):\n${results
      .map((r) => `  • ${r.service}/${r.action}: ${r.ok ? 'ok' : 'falhou'}${r.error ? ` (${r.error})` : ''}`)
      .join('\n')}`,
  };
}
