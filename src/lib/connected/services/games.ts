// Connected Service: Games (Connected RUN / KINGDOM e outros jogos)
import { registerService, type ConnectedService, type HealthStatus } from '../service-bus/registry';
import { db } from '../../../firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { getLeague } from '../../../game/kingdom/league';

async function health(): Promise<HealthStatus> {
  return { status: 'ok', at: Date.now() };
}

export const gamesService: ConnectedService = {
  id: 'games',
  name: 'Connected Games',
  description: 'Connected RUN: KINGDOM, World League e o universo de jogos da Connected.',
  health,
  actions: {
    async players() {
      const r = await getCountFromServer(collection(db, 'gameSaves'));
      return { players: r.data().count };
    },
    async leaderboard(payload: { scope?: string; metric?: string }) {
      const scope = (payload?.scope || 'global') as 'global' | 'africa' | 'mozambique' | 'friends';
      const metric = (payload?.metric || 'score') as 'score' | 'distance' | 'combo' | 'explorer' | 'collector';
      return getLeague(scope, metric, 10);
    },
  },
};

registerService(gamesService);
