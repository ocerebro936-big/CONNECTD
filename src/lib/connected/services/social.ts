// Connected Service: Social (identidade, feed, conexões)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';
import { db } from '../../../firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';

async function health(): Promise<HealthStatus> {
  try {
    await getCountFromServer(collection(db, 'posts'));
    return { status: 'ok', at: Date.now() };
  } catch {
    return { status: 'degraded', detail: 'Firestore indisponível', at: Date.now() };
  }
}

export const socialService: ConnectedService = {
  id: 'social',
  name: 'Connected Social',
  description: 'Identidade, feed, perfis e conexões da rede Connected King.',
  health,
  actions: {
    async stats() {
      const users = await getCountFromServer(collection(db, 'users'));
      const posts = await getCountFromServer(collection(db, 'posts'));
      return { users: users.data().count, posts: posts.data().count };
    },
    async activeUsers(payload: { hours?: number }) {
      const since = Date.now() - (payload?.hours || 24) * 3600_000;
      const q = query(collection(db, 'users'), where('lastActive', '>=', since));
      const r = await getCountFromServer(q);
      return { active: r.data().count };
    },
  },
};

registerService(socialService);
