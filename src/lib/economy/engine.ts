// ============================================================================
// Connected Economy — Engine (orquestração + resumo para DIVINO)
// ============================================================================
import { getWallet } from './wallet';
import { applyEvent } from './rewards';
import { getDailyMissions, claimMission } from './tasks';
import { requestWithdrawal, getWithdrawals } from './withdrawal';
import { listTransactions } from './ledger';
import { recordUsage } from './traffic';
import { REWARDS, WITHDRAW_RULES } from './limits';

// Mapeia ações legadas (usadas em App/Feed) para eventos do motor.
const ACTION_TO_EVENT: Record<string, string> = {
  publish: 'CONTENT_PUBLISHED',
  daily_login: 'DAILY_LOGIN',
  complete_profile: 'PROFILE_COMPLETED',
  invite: 'REFERRAL_COMPLETED',
  run_race: 'GAME_PLAYED',
  publish_engaged: 'CONTENT_VIEWED',
};

export async function awardPoints(
  uid: string,
  action: string,
  opts: { ref?: string; weight?: number } = {}
): Promise<{ awarded: boolean; amount: number }> {
  const event = ACTION_TO_EVENT[action] || action;
  return applyEvent(uid, event, opts);
}

// Resumo só-de-leitura para o DIVINO consultar (nunca movimenta dinheiro).
export async function getEconomySummary(uid: string) {
  const [balance, missions, recent, withdrawals] = await Promise.all([
    getWallet(uid),
    getDailyMissions(uid),
    listTransactions(uid, 5),
    getWithdrawals(uid),
  ]);
  return {
    balance,
    missions,
    recent,
    withdrawalsOpen: withdrawals.filter((w) => w.status === 'pending' || w.status === 'reviewing').length,
  };
}

export { getWallet, applyEvent, getDailyMissions, claimMission, requestWithdrawal, getWithdrawals, listTransactions, recordUsage, REWARDS, WITHDRAW_RULES };
