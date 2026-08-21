// ============================================================================
// Connected Economy — Wallet (saldo virtual + dinheiro real auditável)
// ============================================================================
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { EconomyBalance } from './types';

const WALLETS = 'economyWallets';

function zero(): EconomyBalance {
  return { points: 0, xp: 0, gems: 0, tickets: 0, availableCash: 0, pendingCash: 0, withdrawnCash: 0 };
}

export async function getWallet(uid: string): Promise<EconomyBalance> {
  const ref = doc(db, WALLETS, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as EconomyBalance;
  await setDoc(ref, zero());
  return zero();
}

export async function creditPoints(uid: string, n: number): Promise<void> {
  if (n <= 0) return;
  await updateDoc(doc(db, WALLETS, uid), { points: increment(n), xp: increment(n) });
}

export async function spendVirtual(
  uid: string,
  currency: 'gems' | 'tickets',
  amount: number
): Promise<boolean> {
  const w = await getWallet(uid);
  if (w[currency] < amount) return false;
  await updateDoc(doc(db, WALLETS, uid), { [currency]: increment(-amount) });
  return true;
}

// Ganhos de dinheiro real entram como PENDING (aguardam validação da plataforma).
export async function creditPendingCash(uid: string, mzn: number): Promise<void> {
  if (mzn <= 0) return;
  await updateDoc(doc(db, WALLETS, uid), { pendingCash: increment(mzn) });
}

// Após validação: pending -> available (elegível para saque).
export async function confirmPendingToAvailable(uid: string, mzn: number): Promise<void> {
  if (mzn <= 0) return;
  await updateDoc(doc(db, WALLETS, uid), {
    pendingCash: increment(-mzn),
    availableCash: increment(mzn),
  });
}

// Pedido de saque: available -> pending (reservado até pagamento).
export async function reserveAvailableToPending(uid: string, mzn: number): Promise<void> {
  await updateDoc(doc(db, WALLETS, uid), {
    availableCash: increment(-mzn),
    pendingCash: increment(mzn),
  });
}

// Pago: pending -> withdrawn.
export async function pendingToWithdrawn(uid: string, mzn: number): Promise<void> {
  await updateDoc(doc(db, WALLETS, uid), {
    pendingCash: increment(-mzn),
    withdrawnCash: increment(mzn),
  });
}

// Rejeitado: pending -> available (devolve).
export async function pendingBackToAvailable(uid: string, mzn: number): Promise<void> {
  await updateDoc(doc(db, WALLETS, uid), {
    pendingCash: increment(-mzn),
    availableCash: increment(mzn),
  });
}
