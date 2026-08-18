// Connected Service: Wallet (BlueCoin — moeda interna, NÃO fiat)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', at: Date.now() };
}

export const walletService: ConnectedService = {
  id: 'wallet',
  name: 'Connected Wallet',
  description: 'Carteira BlueCoin (moeda interna de plataforma, sem promessa de valor externo).',
  health,
  actions: {
    async balance(payload: { uid: string }) {
      if (!payload?.uid) return { error: 'uid necessário' };
      const r = await getDoc(doc(db, 'users', payload.uid));
      const d = r.data() || {};
      return { bluecoin: d.bluecoin || 0, energy: d.energy || 0 };
    },
  },
};

registerService(walletService);
