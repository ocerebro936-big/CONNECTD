// ============================================================================
// Connected Economy — Withdrawal (fluxo controlado)
// ----------------------------------------------------------------------------
// User solicita -> verificar saldo -> mínimo -> antifraude -> KYC -> PENDING
// -> Treasury aprova -> Gateway -> PAGO. NUNCA pontos->dinheiro automático.
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
  increment,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getWallet, reserveAvailableToPending, pendingToWithdrawn, pendingBackToAvailable } from './wallet';
import { appendTransaction, listTransactions } from './ledger';
import { WITHDRAW_RULES } from './limits';
import { kycRequiredFor } from './antifraud';
import type { WithdrawalRequest, WithdrawalMethod } from './types';

const WITHDRAWALS = 'economyWithdrawals';

export interface WithdrawResult {
  ok: boolean;
  error?: string;
  requestId?: string;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function requestWithdrawal(
  uid: string,
  input: { method: WithdrawalMethod; amountMZN: number; account: string }
): Promise<WithdrawResult> {
  const method = input.method;
  const amount = Math.round(input.amountMZN);
  const account = (input.account || '').trim();

  if (!WITHDRAW_RULES.methods.includes(method)) return { ok: false, error: 'Método de pagamento inválido.' };
  if (!account) return { ok: false, error: 'Indica o número/conta para pagamento.' };
  if (amount < WITHDRAW_RULES.minMZN) return { ok: false, error: `Mínimo de saque: ${WITHDRAW_RULES.minMZN} MZN.` };

  const wallet = await getWallet(uid);
  if (wallet.availableCash < amount) return { ok: false, error: 'Saldo disponível insuficiente.' };

  const kyc = kycRequiredFor(amount, false);
  if (kyc) return { ok: false, error: 'Verificação de identidade (KYC) necessária para este valor.' };

  const now = Date.now();
  let txs = [];
  try {
    txs = await listTransactions(uid, 300);
  } catch {
    txs = [];
  }
  const withdrawnToday = txs
    .filter((t) => t.type === 'withdrawal' && t.status !== 'rejected' && (new Date(t.createdAt).getTime()) >= startOfDay(now))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const withdrawnMonth = txs
    .filter((t) => t.type === 'withdrawal' && t.status !== 'rejected' && (new Date(t.createdAt).getTime()) >= startOfMonth(now))
    .reduce((s, t) => s + (t.amount || 0), 0);

  if (withdrawnToday + amount > WITHDRAW_RULES.dailyLimitMZN)
    return { ok: false, error: `Limite diário de ${WITHDRAW_RULES.dailyLimitMZN} MZN excedido.` };
  if (withdrawnMonth + amount > WITHDRAW_RULES.monthlyLimitMZN)
    return { ok: false, error: `Limite mensal de ${WITHDRAW_RULES.monthlyLimitMZN} MZN excedido.` };

  // Reserva o saldo (available -> pending) e regista o pedido.
  await reserveAvailableToPending(uid, amount);
  const ref = doc(collection(db, WITHDRAWALS));
  const req: WithdrawalRequest = {
    id: ref.id,
    userId: uid,
    method,
    amountMZN: amount,
    account,
    status: 'pending',
    kycRequired: kyc,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, req);
  await appendTransaction({
    userId: uid,
    type: 'withdrawal',
    amount,
    currency: 'MZN',
    source: `withdraw:${method}`,
    status: 'pending',
  });
  return { ok: true, requestId: ref.id };
}

// Revisão administrativa (Treasury). Pago: pending -> withdrawn.
export async function payWithdrawal(requestId: string): Promise<void> {
  const ref = doc(db, WITHDRAWALS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const req = snap.data() as WithdrawalRequest;
  await updateDoc(ref, { status: 'paid', reviewedAt: new Date().toISOString() });
  await pendingToWithdrawn(req.userId, req.amountMZN);
  await appendTransaction({
    userId: req.userId,
    type: 'withdrawal',
    amount: req.amountMZN,
    currency: 'MZN',
    source: `withdraw:${req.method}`,
    status: 'confirmed',
  });
}

export async function rejectWithdrawal(requestId: string, note?: string): Promise<void> {
  const ref = doc(db, WITHDRAWALS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const req = snap.data() as WithdrawalRequest;
  if (req.status === 'rejected' || req.status === 'paid') return;
  await updateDoc(ref, { status: 'rejected', reviewedAt: new Date().toISOString(), reviewNote: note });
  await pendingBackToAvailable(req.userId, req.amountMZN);
  await appendTransaction({
    userId: req.userId,
    type: 'withdrawal',
    amount: req.amountMZN,
    currency: 'MZN',
    source: `withdraw:${req.method}`,
    status: 'rejected',
  });
}

export async function getWithdrawals(uid: string): Promise<WithdrawalRequest[]> {
  const snap = await getDocs(query(collection(db, WITHDRAWALS), where('userId', '==', uid)));
  return snap.docs.map((d) => d.data() as WithdrawalRequest).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
