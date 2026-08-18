// ============================================================================
// Connected Run — save system offline-first + cloud sync + rankings
// ----------------------------------------------------------------------------
// Regra do utilizador: Game Coins, Connected Points e BlueCoin são sistemas
// separados. Aqui gerimos apenas Game Coins (economia do jogo). O save é
// offline-first (localStorage) e sincroniza com a cloud quando há Internet.
// ============================================================================
import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit as qLimit,
  getDocs,
} from 'firebase/firestore';

export interface RunSave {
  coins: number;
  unlockedLevel: number; // maior nível desbloqueado (1-based)
  scores: Record<number, number>; // melhor pontuação por nível
  displayName?: string;
}

const LOCAL_KEY = 'connected_run_save_v1';

export function defaultSave(): RunSave {
  return { coins: 0, unlockedLevel: 1, scores: {} };
}

export function loadLocalSave(): RunSave {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return {
      coins: Number(parsed.coins) || 0,
      unlockedLevel: Number(parsed.unlockedLevel) || 1,
      scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
    };
  } catch {
    return defaultSave();
  }
}

export function saveLocalSave(s: RunSave): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {
    /* storage indisponível */
  }
}

export async function loadCloudSave(uid: string): Promise<RunSave | null> {
  try {
    const snap = await getDoc(doc(db, 'gameSaves', uid));
    if (!snap.exists()) return null;
    const d = snap.data() as any;
    return {
      coins: Number(d.coins) || 0,
      unlockedLevel: Number(d.unlockedLevel) || 1,
      scores: d.scores && typeof d.scores === 'object' ? d.scores : {},
      displayName: d.displayName,
    };
  } catch {
    return null; // offline ou erro — mantém local
  }
}

export async function syncSaveToCloud(uid: string, save: RunSave): Promise<void> {
  try {
    await setDoc(
      doc(db, 'gameSaves', uid),
      {
        coins: save.coins,
        unlockedLevel: save.unlockedLevel,
        scores: save.scores,
        displayName: save.displayName || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch {
    /* offline — ignora */
  }
}

// Junta local e cloud: mantém o melhor de cada métrica (anti-fraude leve:
// o servidor é a fonte de verdade quando disponível).
export function mergeSaves(local: RunSave, cloud: RunSave | null): RunSave {
  if (!cloud) return local;
  const scores: Record<number, number> = { ...local.scores };
  for (const k of Object.keys(cloud.scores || {})) {
    const key = Number(k);
    scores[key] = Math.max(scores[key] || 0, cloud.scores[key] || 0);
  }
  return {
    coins: Math.max(local.coins, cloud.coins),
    unlockedLevel: Math.max(local.unlockedLevel, cloud.unlockedLevel),
    scores,
    displayName: cloud.displayName || local.displayName,
  };
}

export interface RunRanking {
  uid: string;
  name: string;
  coins: number;
  level: number;
}

export async function getRankings(limitN = 20): Promise<RunRanking[]> {
  try {
    const q = query(collection(db, 'gameSaves'), orderBy('coins', 'desc'), qLimit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        uid: d.id,
        name: data.displayName || 'Jogador',
        coins: Number(data.coins) || 0,
        level: Number(data.unlockedLevel) || 1,
      };
    });
  } catch {
    return [];
  }
}
