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
  // --- Connected RUN: KINGDOM ---
  xp?: number;
  gems?: number;
  tickets?: number;
  badges?: number;
  energy?: number;
  region?: string; // região atual
  regionsUnlocked?: string[]; // regiões desbloqueadas
  items?: string[]; // itens colecionáveis
  cosmetics?: string[]; // cosméticos desbloqueados
  kingVersion?: 'runner' | 'hero' | 'legend';
  bestCombo?: number;
  bestDistance?: number;
  itemsCollected?: number;
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
      xp: Number(parsed.xp) || 0,
      gems: Number(parsed.gems) || 0,
      tickets: Number(parsed.tickets) || 0,
      badges: Number(parsed.badges) || 0,
      energy: Number(parsed.energy) ?? 100,
      region: parsed.region || 'city',
      regionsUnlocked: Array.isArray(parsed.regionsUnlocked) ? parsed.regionsUnlocked : ['city'],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      cosmetics: Array.isArray(parsed.cosmetics) ? parsed.cosmetics : [],
      kingVersion: parsed.kingVersion || 'runner',
      bestCombo: Number(parsed.bestCombo) || 0,
      bestDistance: Number(parsed.bestDistance) || 0,
      itemsCollected: Number(parsed.itemsCollected) || 0,
      displayName: parsed.displayName,
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
      xp: Number(d.xp) || 0,
      gems: Number(d.gems) || 0,
      tickets: Number(d.tickets) || 0,
      badges: Number(d.badges) || 0,
      energy: Number(d.energy) ?? 100,
      region: d.region || 'city',
      regionsUnlocked: Array.isArray(d.regionsUnlocked) ? d.regionsUnlocked : ['city'],
      items: Array.isArray(d.items) ? d.items : [],
      cosmetics: Array.isArray(d.cosmetics) ? d.cosmetics : [],
      kingVersion: d.kingVersion || 'runner',
      bestCombo: Number(d.bestCombo) || 0,
      bestDistance: Number(d.bestDistance) || 0,
      itemsCollected: Number(d.itemsCollected) || 0,
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
        xp: save.xp ?? 0,
        gems: save.gems ?? 0,
        tickets: save.tickets ?? 0,
        badges: save.badges ?? 0,
        energy: save.energy ?? 100,
        region: save.region || 'city',
        regionsUnlocked: save.regionsUnlocked || ['city'],
        items: save.items || [],
        cosmetics: save.cosmetics || [],
        kingVersion: save.kingVersion || 'runner',
        bestCombo: save.bestCombo ?? 0,
        bestDistance: save.bestDistance ?? 0,
        itemsCollected: save.itemsCollected ?? 0,
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
  const union = <T>(a: T[] = [], b: T[] = []): T[] => Array.from(new Set([...a, ...b]));
  return {
    coins: Math.max(local.coins, cloud.coins),
    unlockedLevel: Math.max(local.unlockedLevel, cloud.unlockedLevel),
    scores,
    xp: Math.max(local.xp ?? 0, cloud.xp ?? 0),
    gems: Math.max(local.gems ?? 0, cloud.gems ?? 0),
    tickets: Math.max(local.tickets ?? 0, cloud.tickets ?? 0),
    badges: Math.max(local.badges ?? 0, cloud.badges ?? 0),
    energy: Math.max(local.energy ?? 100, cloud.energy ?? 100),
    region: cloud.region || local.region || 'city',
    regionsUnlocked: union(local.regionsUnlocked, cloud.regionsUnlocked),
    items: union(local.items, cloud.items),
    cosmetics: union(local.cosmetics, cloud.cosmetics),
    kingVersion: (cloud.kingVersion as any) || local.kingVersion || 'runner',
    bestCombo: Math.max(local.bestCombo ?? 0, cloud.bestCombo ?? 0),
    bestDistance: Math.max(local.bestDistance ?? 0, cloud.bestDistance ?? 0),
    itemsCollected: Math.max(local.itemsCollected ?? 0, cloud.itemsCollected ?? 0),
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
