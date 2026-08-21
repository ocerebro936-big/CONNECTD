// ============================================================================
// Connected Economy Engine — modelo de dados
// ----------------------------------------------------------------------------
// REGRA FUNDAMENTAL (req. do produto):
//   • MOEDA VIRTUAL (gems/tickets) — só para jogos/eventos, NUNCA resgatável.
//   • PONTOS PROMOCIONAIS (points) — ganhos por atividade legítima; resgatáveis
//     SÓ através de saque com regras (KYC, limites, antifraude). NÃO são dinheiro.
//   • DINHEIRO REAL (realBalanceMZN) — crédito da plataforma por receita efetiva
//     gerada (partilha de receita, creator earnings). NUNCA convertido
//     automaticamente a partir de pontos.
// ============================================================================

export type VirtualCurrency = 'gems' | 'tickets';
export type Currency = 'points' | 'gems' | 'tickets' | 'MZN';

export interface WalletDoc {
  uid: string;
  points: number; // promocionais, resgatáveis sob regras
  gems: number; // virtual (jogos)
  tickets: number; // virtual (eventos)
  realBalanceMZN: number; // dinheiro real disponível para saque
  totalEarnedPoints: number;
  totalEarnedMZN: number;
  totalWithdrawnMZN: number;
  kycVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

export type WalletTxType =
  | 'earn_points'
  | 'earn_real'
  | 'spend_gems'
  | 'spend_tickets'
  | 'withdraw_request'
  | 'withdraw_paid'
  | 'withdraw_rejected'
  | 'mission';

export interface WalletTx {
  id?: string;
  uid: string;
  type: WalletTxType;
  currency: Currency;
  amount: number; // sempre positivo; o saldo reflete o sinal pelo tipo
  reason: string;
  ref?: string; // dedupe (ex.: postId, 'daily_login_2026-08-21')
  createdAt: number;
}

export type WithdrawalMethod = 'mpesa' | 'emola' | 'bank' | 'visa' | 'paypal';

export type WithdrawalStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'paid'
  | 'rejected';

export interface WithdrawalRequest {
  id?: string;
  uid: string;
  method: WithdrawalMethod;
  amountMZN: number;
  account: string;
  status: WithdrawalStatus;
  kycRequired: boolean;
  createdAt: number;
  reviewedAt?: number;
  reviewNote?: string;
}

export interface EarningRule {
  action: string;
  currency: 'points' | 'MZN';
  amount: number;
  dailyCap: number; // máximo por dia (antifraude)
  needsRef?: boolean; // dedupe por ref (ex.: um prémio por post)
  label: string;
}
