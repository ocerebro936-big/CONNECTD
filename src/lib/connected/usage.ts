// Connected Usage & Billing Engine — mede recursos e define tiers.
import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export type UsageDimension =
  | 'storage'
  | 'bandwidth'
  | 'compute'
  | 'ai'
  | 'video'
  | 'ads'
  | 'premium'
  | 'games';

export const TIERS = ['Free', 'Plus', 'Pro', 'Creator', 'Business', 'Enterprise'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LIMITS: Record<Tier, Record<UsageDimension, number>> = {
  Free: { storage: 2, bandwidth: 10, compute: 1, ai: 100, video: 30, ads: 0, premium: 0, games: 10 },
  Plus: { storage: 50, bandwidth: 200, compute: 10, ai: 2000, video: 300, ads: 5, premium: 1, games: 50 },
  Pro: { storage: 500, bandwidth: 2000, compute: 100, ai: 20000, video: 3000, ads: 50, premium: 5, games: 200 },
  Creator: { storage: 1000, bandwidth: 5000, compute: 200, ai: 40000, video: 8000, ads: 100, premium: 10, games: 500 },
  Business: { storage: 5000, bandwidth: 20000, compute: 1000, ai: 100000, video: 30000, ads: 500, premium: 50, games: 2000 },
  Enterprise: { storage: Infinity, bandwidth: Infinity, compute: Infinity, ai: Infinity, video: Infinity, ads: Infinity, premium: Infinity, games: Infinity },
};

export interface UsageRecord {
  uid: string;
  dimension: UsageDimension;
  amount: number;
  tier: Tier;
  at?: any;
}

export function trackUsage(uid: string, dimension: UsageDimension, amount: number, tier: Tier = 'Free'): void {
  const rec: UsageRecord = { uid, dimension, amount, tier, at: serverTimestamp() };
  addDoc(collection(db, 'usage'), rec).catch(() => undefined);
}

export function withinLimit(tier: Tier, dimension: UsageDimension, requested: number): boolean {
  return requested <= TIER_LIMITS[tier][dimension];
}
