// Connected Service: Cloud (CCS / Connected Cloud Storage)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';
import { connectedStorage } from '../../cloud-storage/provider';

async function health(): Promise<HealthStatus> {
  const pid = connectedStorage.provider?.constructor?.name || 'unknown';
  try {
    await connectedStorage.metadata('_health_probe.txt');
    return { status: 'ok', detail: `provider=${pid}`, at: Date.now() };
  } catch {
    return { status: 'degraded', detail: `provider=${pid} (sem bucket ativo?)`, at: Date.now() };
  }
}

export const cloudService: ConnectedService = {
  id: 'cloud',
  name: 'Connected Cloud Storage',
  description: 'Armazenamento agnóstico (S3 / MEGA / Firebase) da Connected King.',
  health,
  actions: {
    async provider() {
      return { provider: connectedStorage.provider?.constructor?.name || 'unknown' };
    },
    async inspect(payload: { path?: string }) {
      return connectedStorage.metadata(payload?.path || '');
    },
  },
};

registerService(cloudService);
