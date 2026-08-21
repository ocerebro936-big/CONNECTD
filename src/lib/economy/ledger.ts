// ============================================================================
// Connected Economy — Ledger (tudo auditável)
// ============================================================================
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit as qLimit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { EconomyTransaction } from './types';

const LEDGER = 'economyLedger';

export async function appendTransaction(
  tx: Omit<EconomyTransaction, 'id' | 'createdAt'>
): Promise<EconomyTransaction> {
  const ref = doc(collection(db, LEDGER));
  const full: EconomyTransaction = {
    ...tx,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, full);
  return full;
}

export async function listTransactions(
  userId: string,
  max = 50
): Promise<EconomyTransaction[]> {
  const snap = await getDocs(
    query(
      collection(db, LEDGER),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      qLimit(max)
    )
  );
  return snap.docs.map((d) => d.data() as EconomyTransaction);
}
