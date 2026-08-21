// ============================================================================
// Connected Economy Engine — núcleo
// ----------------------------------------------------------------------------
// Operações sobre a carteira com regras antifraude: teto diário por ação e
// deduplicação por referência (ex.: um prémio por publicação). Nunca converte
// pontos em dinheiro real automaticamente.
// ============================================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as qLimit,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type {
  WalletDoc,
  WalletTx,
  WalletTxType,
  Currency,
  EarningRule,
} from './types';

const WALLETS = 'wallets';
const TX = 'walletTx';

export const EARNING_RULES: Record<string, EarningRule> = {
  complete_profile: { action: 'complete_profile', currency: 'points', amount: 100, dailyCap: 1, needsRef: true, label: 'Completar perfil' },
  publish: { action: 'publish', currency: 'points', amount: 20, dailyCap: 20, needsRef: true, label: 'Publicar foto ou vídeo' },
  publish_engaged: { action: 'publish_engaged', currency: 'points', amount: 200, dailyCap: 5, needsRef: true, label: 'Publicação com bom engajamento' },
  invite: { action: 'invite', currency: 'points', amount: 150, dailyCap: 10, needsRef: true, label: 'Convidar amigo ativo' },
  daily_login: { action: 'daily_login', currency: 'points', amount: 10, dailyCap: 1, needsRef: true, label: 'Entrar hoje' },
  run_race: { action: 'run_race', currency: 'points', amount: 50, dailyCap: 10, label: 'Corrida no Connected RUN' },
  mission: { action: 'mission', currency: 'points', amount: 0, dailyCap: 999, label: 'Missão diária' },
};

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function ensureWallet(uid: string): Promise<WalletDoc> {
  const ref = doc(db, WALLETS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as WalletDoc;
  const now = Date.now();
  const fresh: WalletDoc = {
    uid,
    points: 0,
    gems: 0,
    tickets: 0,
    realBalanceMZN: 0,
    totalEarnedPoints: 0,
    totalEarnedMZN: 0,
    totalWithdrawnMZN: 0,
    kycVerified: false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, fresh);
  return fresh;
}

export async function getWallet(uid: string): Promise<WalletDoc> {
  return ensureWallet(uid);
}

async function writeTx(tx: Omit<WalletTx, 'id' | 'createdAt'>): Promise<void> {
  const ref = doc(collection(db, TX));
  await setDoc(ref, { ...tx, createdAt: Date.now() });
}

async function recentTx(uid: string, action?: string, ref?: string): Promise<WalletTx[]> {
  let q = query(
    collection(db, TX),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    qLimit(100)
  );
  if (action) q = query(q, where('type', '==', 'earn_points'), where('reason', '==', action));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => d.data() as WalletTx);
  if (ref) return all.filter((t) => t.ref === ref);
  return all;
}

export interface AwardResult {
  awarded: boolean;
  amount: number;
  reason?: string;
}

export async function awardPoints(
  uid: string,
  action: string,
  opts: { ref?: string; weight?: number } = {}
): Promise<AwardResult> {
  const rule = EARNING_RULES[action];
  if (!rule || rule.currency !== 'points') return { awarded: false, amount: 0 };

  // 1) Dedupe por referência (ex.: um prémio por post/publicação)
  if (rule.needsRef && opts.ref) {
    const dup = await recentTx(uid, action, opts.ref);
    if (dup.length > 0) return { awarded: false, amount: 0, reason: 'already awarded' };
  }

  // 2) Teto diário (antifraude)
  const today = todayStart();
  const todays = (await recentTx(uid, action)).filter((t) => (t.createdAt || 0) >= today);
  if (todays.length >= rule.dailyCap) {
    return { awarded: false, amount: 0, reason: 'daily cap reached' };
  }

  const amount = Math.round(rule.amount * (opts.weight || 1));
  if (amount <= 0) return { awarded: false, amount: 0 };

  const walletRef = doc(db, WALLETS, uid);
  await ensureWallet(uid);
  await updateDoc(walletRef, {
    points: increment(amount),
    totalEarnedPoints: increment(amount),
    updatedAt: Date.now(),
  });
  await writeTx({
    uid,
    type: 'earn_points',
    currency: 'points',
    amount,
    reason: action,
    ref: opts.ref || (rule.needsRef ? `${action}_${dayKey()}` : undefined),
  });
  return { awarded: true, amount };
}

// Crédito de DINHEIRO REAL — ONLY via receita efetiva da plataforma.
export async function creditRealEarnings(
  uid: string,
  mzn: number,
  reason: string,
  ref?: string
): Promise<void> {
  if (mzn <= 0) return;
  const walletRef = doc(db, WALLETS, uid);
  await ensureWallet(uid);
  await updateDoc(walletRef, {
    realBalanceMZN: increment(mzn),
    totalEarnedMZN: increment(mzn),
    updatedAt: Date.now(),
  });
  await writeTx({ uid, type: 'earn_real', currency: 'MZN', amount: mzn, reason, ref });
}

export async function spendVirtual(
  uid: string,
  currency: 'gems' | 'tickets',
  amount: number,
  reason: string
): Promise<boolean> {
  const w = await ensureWallet(uid);
  if ((currency === 'gems' ? w.gems : w.tickets) < amount) return false;
  const walletRef = doc(db, WALLETS, uid);
  await updateDoc(walletRef, {
    [currency]: increment(-amount),
    updatedAt: Date.now(),
  });
  await writeTx({ uid, type: currency === 'gems' ? 'spend_gems' : 'spend_tickets', currency, amount, reason });
  return true;
}

// Prémio livre (missões) com dedupe por ref. Não passa pelas regras fixas.
export async function awardCustomPoints(
  uid: string,
  amount: number,
  reason: string,
  ref?: string
): Promise<AwardResult> {
  if (amount <= 0) return { awarded: false, amount: 0 };
  if (ref) {
    const dup = await recentTx(uid, reason, ref);
    if (dup.length > 0) return { awarded: false, amount: 0, reason: 'already claimed' };
  }
  await ensureWallet(uid);
  await updateDoc(doc(db, WALLETS, uid), {
    points: increment(amount),
    totalEarnedPoints: increment(amount),
    updatedAt: Date.now(),
  });
  await writeTx({ uid, type: 'mission', currency: 'points', amount, reason, ref });
  return { awarded: true, amount };
}

export async function getHistory(uid: string, max = 40): Promise<WalletTx[]> {
  const snap = await getDocs(
    query(collection(db, TX), where('uid', '==', uid), orderBy('createdAt', 'desc'), qLimit(max))
  );
  return snap.docs.map((d) => d.data() as WalletTx);
}
