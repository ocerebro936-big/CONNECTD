// Connected RUN: KINGDOM — World League (métricas + leaderboards).
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit as qLimit, getDocs } from 'firebase/firestore';
import type { RunSave } from '../../lib/game-save';

export type LeagueScope = 'global' | 'africa' | 'mozambique' | 'friends';
export type LeagueMetric = 'score' | 'distance' | 'combo' | 'explorer' | 'collector';

export interface LeagueRow {
  uid: string;
  name: string;
  value: number;
}

export function computeMetrics(save: RunSave) {
  return {
    score: save.coins || 0,
    distance: save.bestDistance || 0,
    combo: save.bestCombo || 0,
    explorer: (save.regionsUnlocked || []).length,
    collector: save.itemsCollected || 0,
  };
}

export async function getLeague(scope: LeagueScope, metric: LeagueMetric, limitN = 10): Promise<LeagueRow[]> {
  try {
    const regionFilter = scope === 'mozambique' ? 'mozambique' : scope === 'africa' ? 'africa' : null;
    const q = query(
      collection(db, 'gameSaves'),
      ...(regionFilter ? [where('regionScope', '==', regionFilter)] : []),
      orderBy(metric === 'score' ? 'coins' : metric, 'desc'),
      qLimit(limitN)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      const value =
        metric === 'score' ? data.coins || 0
        : metric === 'distance' ? data.bestDistance || 0
        : metric === 'combo' ? data.bestCombo || 0
        : metric === 'explorer' ? (data.regionsUnlocked?.length || 1)
        : data.itemsCollected || 0;
      return { uid: d.id, name: data.displayName || 'Jogador', value };
    });
  } catch {
    return [];
  }
}
