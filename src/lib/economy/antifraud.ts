// ============================================================================
// Connected Economy — Anti-fraude (fundação)
// ----------------------------------------------------------------------------
// Verifica teto diário por evento, teto diário global e duplicação por ref.
// NUNCA converte pontos em dinheiro; apenas protege a atribuição de pontos.
// ============================================================================
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { listTransactions } from './ledger';
import { EVENT_DAILY_CAPS } from './limits';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Conta quantas vezes um evento ocorreu hoje para o utilizador (via ledger).
export async function eventCountToday(
  userId: string,
  source: string
): Promise<number> {
  const today = startOfToday();
  const txs = await listTransactions(userId, 200);
  return txs.filter(
    (t) => t.source === source && t.type === 'reward' && (new Date(t.createdAt).getTime()) >= today
  ).length;
}

export async function eventAllowed(
  userId: string,
  event: string
): Promise<boolean> {
  const cap = EVENT_DAILY_CAPS[event] ?? 999;
  const count = await eventCountToday(userId, event);
  return count < cap;
}

// Dedupe por referência (ex.: um prémio por publicação/asset).
export async function isDuplicateRef(
  userId: string,
  source: string,
  ref?: string
): Promise<boolean> {
  if (!ref) return false;
  const snap = await getDocs(
    query(
      collection(db, 'economyLedger'),
      where('userId', '==', userId),
      where('source', '==', `${source}:${ref}`),
      qLimit(1)
    )
  );
  return !snap.empty;
}

export function kycRequiredFor(amountMZN: number, kycVerified: boolean): boolean {
  return amountMZN >= 500 && !kycVerified;
}
