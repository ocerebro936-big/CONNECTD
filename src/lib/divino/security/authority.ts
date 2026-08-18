// ============================================================================
// DIVINO IA — Authority Engine
// ----------------------------------------------------------------------------
// Decide se uma ação pode ser executada conforme o papel de quem pede e a
// política. Nunca executa ações proibidas.
// ============================================================================
import { DIVINO_POLICY, rankOf, type DivinoAction } from './policy';
import type { DivinoRole } from '../types';

export interface AuthorityDecision {
  allowed: boolean;
  reason: string;
  requiresConfirmation: boolean;
}

export const authority = {
  decide(role: DivinoRole, action: DivinoAction): AuthorityDecision {
    const p = DIVINO_POLICY[action];
    if (p.forbidden) return { allowed: false, reason: 'Ação proibida pela política da Connected King.', requiresConfirmation: false };
    if (rankOf(role) < rankOf(p.minRole)) {
      return {
        allowed: false,
        reason: `Requer nível de autoridade '${p.minRole}' (tens '${role}').`,
        requiresConfirmation: false,
      };
    }
    return { allowed: true, reason: 'Autorizado.', requiresConfirmation: p.confirm };
  },

  can(role: DivinoRole, action: DivinoAction): boolean {
    return this.decide(role, action).allowed;
  },
};
