// ============================================================================
// Connected Cloud Core — Quota Engine (client-side)
// ----------------------------------------------------------------------------
// Limites por escalão. A aplicação avisa antes de estourar a quota; a regra
// real de bloqueio vive nas Storage/Firestore rules. Aqui só medimos e alertamos.
// ============================================================================
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export type StorageTier = 'free' | 'creator' | 'pro' | 'business';

export const QUOTA_BYTES: Record<StorageTier, number> = {
  free: 1 * 1024 * 1024 * 1024, // 1 GB
  creator: 20 * 1024 * 1024 * 1024, // 20 GB
  pro: 100 * 1024 * 1024 * 1024, // 100 GB
  business: 500 * 1024 * 1024 * 1024, // 500 GB+
};

export function getTier(user: any, profileData?: any): StorageTier {
  const role = profileData?.role || user?.role;
  if (role === 'business' || profileData?.plan === 'business') return 'business';
  if (role === 'pro' || profileData?.plan === 'pro') return 'pro';
  if (role === 'creator' || profileData?.plan === 'creator') return 'creator';
  return 'free';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

/** Soma o tamanho de todos os objetos ativos do utilizador (cloudAssets). */
export async function computeUsedBytes(ownerId: string): Promise<number> {
  const q = query(collection(db, 'cloudAssets'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach((d) => {
    const s = (d.data() as any).size;
    if (typeof s === 'number') total += s;
  });
  return total;
}

export interface QuotaCheck {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: StorageTier;
}

export async function checkQuota(ownerId: string, addBytes: number, user: any, profileData?: any): Promise<QuotaCheck> {
  const tier = getTier(user, profileData);
  const limit = QUOTA_BYTES[tier];
  const used = await computeUsedBytes(ownerId);
  const remaining = limit - used - addBytes;
  return { ok: remaining >= 0, used, limit, remaining, tier };
}
