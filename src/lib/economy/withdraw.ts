// ============================================================================
// Connected Economy — Saques reais (com regras)
// ----------------------------------------------------------------------------
// O saldo real (MZN) só é creditado pela plataforma por receita efetiva. O
// saque exige: valor mínimo, saldo suficiente, KYC acima de limiar, e respeita
// limites diário/mensal. NUNCA se converte pontos em dinheiro automaticamente.
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
import { getWallet, getHistory } from './engine';
import type { WithdrawalRequest, WithdrawalMethod } from './types';

const WITHDRAWALS = 'withdrawals';

export const WITHDRAW_RULES = {
  minMZN: 100,
  kycThresholdMZN: 500,
  dailyLimitMZN: 5000,
  monthlyLimitMZN: 50000,
  methods: ['mpesa', 'emola', 'bank', 'visa', 'paypal'] as WithdrawalMethod[],
};

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
  if (wallet.realBalanceMZN < amount) return { ok: false, error: 'Saldo real insuficiente.' };

  const kycRequired = amount >= WITHDRAW_RULES.kycThresholdMZN && !wallet.kycVerified;
  if (kycRequired) return { ok: false, error: 'Verificação de identidade (KYC) necessária para este valor.' };

  // Limites diário/mensal
  const now = Date.now();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  let txs = [];
  try {
    txs = await getHistory(uid, 300);
  } catch {
    txs = [];
  }
  const withdrawnToday = txs
    .filter((t) => t.type === 'withdraw_request' && (t.createdAt || 0) >= dayStart)
    .reduce((s, t) => s + t.amount, 0);
  const withdrawnMonth = txs
    .filter((t) => t.type === 'withdraw_request' && (t.createdAt || 0) >= monthStart)
    .reduce((s, t) => s + t.amount, 0);

  if (withdrawnToday + amount > WITHDRAW_RULES.dailyLimitMZN)
    return { ok: false, error: `Limite diário de ${WITHDRAW_RULES.dailyLimitMZN} MZN excedido.` };
  if (withdrawnMonth + amount > WITHDRAW_RULES.monthlyLimitMZN)
    return { ok: false, error: `Limite mensal de ${WITHDRAW_RULES.monthlyLimitMZN} MZN excedido.` };

  const ref = doc(collection(db, WITHDRAWALS));
  const req: WithdrawalRequest = {
    id: ref.id,
    uid,
    method,
    amountMZN: amount,
    account,
    status: kycRequired ? 'reviewing' : 'pending',
    kycRequired,
    createdAt: now,
  };
  await setDoc(ref, req);

  // Deduz do saldo real imediatamente e regista a transação.
  const walletRef = doc(db, 'wallets', uid);
  await updateDoc(walletRef, {
    realBalanceMZN: increment(-amount),
    totalWithdrawnMZN: increment(amount),
    updatedAt: Date.now(),
  });
  const txRef = doc(collection(db, 'walletTx'));
  await setDoc(txRef, {
    uid,
    type: 'withdraw_request',
    currency: 'MZN',
    amount,
    reason: `withdraw:${method}`,
    createdAt: now,
  });

  return { ok: true, requestId: ref.id };
}

export async function getWithdrawals(uid: string): Promise<WithdrawalRequest[]> {
  const snap = await getDocs(query(collection(db, WITHDRAWALS), where('uid', '==', uid)));
  return snap.docs.map((d) => d.data() as WithdrawalRequest).sort((a, b) => b.createdAt - a.createdAt);
}
