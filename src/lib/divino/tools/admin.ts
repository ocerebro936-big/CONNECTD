// Ferramenta: Administração — diagnóstico de serviços Connected.
import { ccsDiagnostics } from './cloud';

export async function serviceHealth(): Promise<{ ok: boolean; summary: string; data: any }> {
  const ccs = await ccsDiagnostics();
  return {
    ok: true,
    summary: `Saúde dos serviços → CCS: ${ccs.data.status}. Os demais serviços respondem via Firestore/Hosting.`,
    data: { ccs: ccs.data.status },
  };
}
