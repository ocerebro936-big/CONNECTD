// ============================================================================
// Connected Economy Engine — facade pública
// ----------------------------------------------------------------------------
// Separa moeda virtual (gems/tickets), pontos promocionais (points) e dinheiro
// real (MZN). A plataforma ganha com tráfego/serviços; o utilizador ganha pontos
// por atividade legítima e pode sacar dinheiro real conforme regras (KYC/limites).
// ============================================================================
export * from './types';
export type { DailyMission } from './tasks';
export {
  getWallet,
  ensureWallet,
  awardPoints,
  awardCustomPoints,
  creditRealEarnings,
  spendVirtual,
  getHistory,
  EARNING_RULES,
} from './engine';
export { getDailyMissions, claimMission } from './tasks';
export { requestWithdrawal, getWithdrawals, WITHDRAW_RULES } from './withdraw';

import {
  getWallet,
  awardPoints,
  awardCustomPoints,
  creditRealEarnings,
  spendVirtual,
  getHistory,
} from './engine';
import { getDailyMissions, claimMission } from './tasks';
import { requestWithdrawal, getWithdrawals, WITHDRAW_RULES } from './withdraw';

export const connectedEconomy = {
  getWallet,
  awardPoints,
  awardCustomPoints,
  creditRealEarnings,
  spendVirtual,
  getHistory,
  getDailyMissions,
  claimMission,
  requestWithdrawal,
  getWithdrawals,
  WITHDRAW_RULES,
};

export const connectedWallet = connectedEconomy;
