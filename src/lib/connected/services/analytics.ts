// Connected Service: Analytics (métricas agregadas da plataforma)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';
import { db } from '../../../firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', at: Date.now() };
}

export const analyticsService: ConnectedService = {
  id: 'analytics',
  name: 'Connected Analytics',
  description: 'Métricas agregadas de uso da plataforma Connected King.',
  health,
  actions: {
    async summary() {
      const users = await getCountFromServer(collection(db, 'users'));
      const posts = await getCountFromServer(collection(db, 'posts'));
      return {
        users: users.data().count,
        posts: posts.data().count,
        generatedAt: Date.now(),
      };
    },
  },
};

registerService(analyticsService);
