// Connected Service: TV (Connected TV — canais, programação, streaming)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', detail: 'catálogo em memória', at: Date.now() };
}

const CHANNELS = [
  { id: 'ck1', name: 'Connected Live', genre: 'Ao vivo', viewers: 1280 },
  { id: 'ck2', name: 'King Sports', genre: 'Desporto', viewers: 930 },
  { id: 'ck3', name: 'Creator Spot', genre: 'Criadores', viewers: 540 },
];

export const tvService: ConnectedService = {
  id: 'tv',
  name: 'Connected TV',
  description: 'Plataforma de vídeo, canais e streaming da Connected King.',
  health,
  actions: {
    async channels() {
      return CHANNELS;
    },
    async viewers() {
      return { total: CHANNELS.reduce((a, c) => a + c.viewers, 0) };
    },
  },
};

registerService(tvService);
