// ============================================================================
// Connected Economy — Rewards Engine
// ----------------------------------------------------------------------------
// Cada evento legítimo passa por regra + anti-fraude e credita PONTOS (nunca
// dinheiro). O dinheiro real só entra via Treasury (receita da plataforma).
// ============================================================================
import { creditPoints } from './wallet';
import { appendTransaction } from './ledger';
import { eventAllowed, isDuplicateRef } from './antifraud';
import { REWARDS } from './limits';

export interface RewardResult {
  awarded: boolean;
  amount: number;
  reason?: string;
}

export async function applyEvent(
  uid: string,
  event: string,
  opts: { ref?: string; weight?: number } = {}
): Promise<RewardResult> {
  const base = REWARDS[event];
  if (!base) return { awarded: false, amount: 0, reason: 'no rule' };

  // Anti-fraude: teto diário por evento
  if (!(await eventAllowed(uid, event))) {
    return { awarded: false, amount: 0, reason: 'daily cap' };
  }
  // Anti-fraude: dedupe por referência
  if (opts.ref && (await isDuplicateRef(uid, event, opts.ref))) {
    return { awarded: false, amount: 0, reason: 'duplicate' };
  }

  const amount = Math.round(base * (opts.weight || 1));
  if (amount <= 0) return { awarded: false, amount: 0 };

  await creditPoints(uid, amount);
  await appendTransaction({
    userId: uid,
    type: 'reward',
    points: amount,
    source: opts.ref ? `${event}:${opts.ref}` : event,
    status: 'confirmed',
  });
  return { awarded: true, amount };
}
