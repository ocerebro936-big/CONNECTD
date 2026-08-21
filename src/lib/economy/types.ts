// ============================================================================
// Connected Economy — tipos centrais
// ----------------------------------------------------------------------------
// REGRA FUNDAMENTAL: moedas virtuais (points/xp/gems/tickets) NUNCA são
// dinheiro. O dinheiro real (MZN) existe em três estados auditáveis:
//   availableCash -> elegível para saque
//   pendingCash   -> reservado/em validação (saque pendente ou ganhos a confirmar)
//   withdrawnCash -> já pago
// ============================================================================

export type EconomyCurrency = 'points' | 'xp' | 'gems' | 'tickets' | 'MZN';

export interface EconomyBalance {
  points: number;
  xp: number;
  gems: number;
  tickets: number;
  availableCash: number;
  pendingCash: number;
  withdrawnCash: number;
}

export type EconomyEvent =
  | 'TASK_COMPLETED'
  | 'DAILY_LOGIN'
  | 'CONTENT_PUBLISHED'
  | 'CONTENT_VIEWED'
  | 'CONTENT_SHARED'
  | 'GAME_PLAYED'
  | 'GAME_REWARD'
  | 'REFERRAL_COMPLETED'
  | 'PROFILE_COMPLETED';

export type EconomyTxType =
  | 'reward'
  | 'purchase'
  | 'withdrawal'
  | 'refund'
  | 'adjustment'
  | 'treasury';

export type EconomyTxStatus = 'pending' | 'confirmed' | 'rejected';

export interface EconomyTransaction {
  id: string;
  userId: string;
  type: EconomyTxType;
  points?: number;
  amount?: number;
  currency?: 'MZN';
  source: string;
  status: EconomyTxStatus;
  createdAt: string;
}

export interface TrafficUsage {
  userId: string;
  assetId: string;
  uploadBytes: number;
  downloadBytes: number;
  requests: number;
  views: number;
  period: string; // ex.: "2026-08"
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
  userId: string;
  method: WithdrawalMethod;
  amountMZN: number;
  account: string;
  status: WithdrawalStatus;
  kycRequired: boolean;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}
