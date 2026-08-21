// ============================================================================
// Connected Economy — facade pública
// ----------------------------------------------------------------------------
// Separa moeda virtual (points/xp/gems/tickets) de dinheiro real (MZN em
// available/pending/withdrawn). A plataforma ganha com tráfego/serviços; o
// utilizador ganha pontos por atividade legítima e saca dinheiro real conforme
// regras (KYC/limites/antifraude). DIVINO só CONSULTA — não movimenta.
// ============================================================================
export * from './types';
export * from './limits';
export * from './ledger';
export * from './antifraud';
export * from './rewards';
export * from './wallet';
export * from './treasury';
export * from './tasks';
export * from './traffic';
export * from './withdrawal';
export { awardPoints, getEconomySummary } from './engine';

import {
  getWallet,
  applyEvent,
  getDailyMissions,
  claimMission,
  requestWithdrawal,
  getWithdrawals,
  listTransactions,
  recordUsage,
  getEconomySummary,
  awardPoints,
  WITHDRAW_RULES,
} from './engine';

export const connectedEconomy = {
  getWallet,
  getBalance: getWallet,
  applyEvent,
  awardPoints,
  getDailyMissions,
  claimMission,
  requestWithdrawal,
  getWithdrawals,
  getHistory: listTransactions,
  recordUsage,
  getEconomySummary,
  WITHDRAW_RULES,
};

export const connectedWallet = connectedEconomy;
