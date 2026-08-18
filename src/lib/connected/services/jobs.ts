// Connected Service: Jobs (emprego, criadores, colaboradores)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', at: Date.now() };
}

const ROLES = [
  { id: 'j1', title: 'Criador de Conteúdo', type: 'creator', pays: 'BlueCoin' },
  { id: 'j2', title: 'Moderador Comunitário', type: 'staff', pays: 'BlueCoin' },
  { id: 'j3', title: 'Parceiro Patrocinador', type: 'partner', pays: 'contrato' },
];

export const jobsService: ConnectedService = {
  id: 'jobs',
  name: 'Connected Jobs',
  description: 'Emprego, criadores e colaboradores da economia Connected.',
  health,
  actions: {
    async listings() {
      return ROLES;
    },
  },
};

registerService(jobsService);
