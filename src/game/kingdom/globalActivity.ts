// Connected RUN: KINGDOM — Global Activity System.
// Contadores globais em Firestore: o mundo evolui com a comunidade.
import { db } from '../../firebase';
import { doc, getDoc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { REGIONS } from './regions';

const GLOBAL_REF = doc(db, 'runGlobal', 'activity');

export interface GlobalActivity {
  totalRuns: number;
  regionsUnlocked: string[];
  season: string;
  lastEvent?: string;
}

export async function recordRun(regionId: string): Promise<GlobalActivity | null> {
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(GLOBAL_REF);
      const data = (snap.exists() ? snap.data() : { totalRuns: 0, regionsUnlocked: ['city'], season: 'S1' }) as GlobalActivity;
      const totalRuns = (data.totalRuns || 0) + 1;
      const regionsUnlocked = new Set([...(data.regionsUnlocked || ['city']), regionId]);
      // Desbloqueio por marcos globais.
      for (const r of REGIONS) {
        if (r.unlockRuns && totalRuns >= r.unlockRuns) regionsUnlocked.add(r.id);
      }
      const next = { ...data, totalRuns, regionsUnlocked: Array.from(regionsUnlocked) };
      tx.set(GLOBAL_REF, next, { merge: true });
      return next;
    });
  } catch {
    return null;
  }
}

export async function getGlobalActivity(): Promise<GlobalActivity | null> {
  try {
    const snap = await getDoc(GLOBAL_REF);
    return snap.exists() ? (snap.data() as GlobalActivity) : null;
  } catch {
    return null;
  }
}
