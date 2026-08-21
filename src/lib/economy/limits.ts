// ============================================================================
// Connected Economy — limites e regras de recompensa (auditável)
// ============================================================================

export type EconomyEvent_ = string;

export const REWARDS: Record<string, number> = {
  DAILY_LOGIN: 5,
  CONTENT_PUBLISHED: 10,
  CONTENT_SHARED: 2,
  GAME_PLAYED: 3,
  TASK_COMPLETED: 25,
  PROFILE_COMPLETED: 50,
  REFERRAL_COMPLETED: 100,
  GAME_REWARD: 5,
};

// Teto diário de ocorrências por evento (antifraude: impede farm de pontos)
export const EVENT_DAILY_CAPS: Record<string, number> = {
  DAILY_LOGIN: 1,
  CONTENT_PUBLISHED: 20,
  CONTENT_SHARED: 30,
  GAME_PLAYED: 20,
  TASK_COMPLETED: 5,
  PROFILE_COMPLETED: 1,
  REFERRAL_COMPLETED: 10,
  GAME_REWARD: 20,
};

export const WITHDRAW_RULES = {
  minMZN: 100,
  kycThresholdMZN: 500,
  dailyLimitMZN: 5000,
  monthlyLimitMZN: 50000,
  methods: ['mpesa', 'emola', 'bank', 'visa', 'paypal'] as const,
};

export const KYC_METHODS = WITHDRAW_RULES.methods;
