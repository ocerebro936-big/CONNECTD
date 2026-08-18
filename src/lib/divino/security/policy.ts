// ============================================================================
// DIVINO IA — Policy Engine (níveis de autoridade)
// ----------------------------------------------------------------------------
// Cada ação tem um papel mínimo exigido e se requer confirmação. Ações
// proibidas pela política NUNCA são executadas, mesmo que solicitadas.
// ============================================================================
import type { DivinoRole } from '../types';

const ROLE_RANK: Record<DivinoRole, number> = {
  public: 0,
  user: 1,
  moderator: 2,
  admin: 3,
  superadmin: 4,
};

export type DivinoAction =
  | 'read_public'
  | 'read_own_data'
  | 'read_any_user'
  | 'inspect_own_storage'
  | 'inspect_any_storage'
  | 'create_ticket'
  | 'delete_own_file'
  | 'delete_any_file'
  | 'ban_user'
  | 'alter_config'
  | 'financial_op'
  | 'run_diagnostics';

interface ActionPolicy {
  minRole: DivinoRole;
  confirm: boolean;
  forbidden?: boolean;
}

export const DIVINO_POLICY: Record<DivinoAction, ActionPolicy> = {
  read_public: { minRole: 'public', confirm: false },
  read_own_data: { minRole: 'user', confirm: false },
  read_any_user: { minRole: 'moderator', confirm: false },
  inspect_own_storage: { minRole: 'user', confirm: false },
  inspect_any_storage: { minRole: 'admin', confirm: false },
  create_ticket: { minRole: 'user', confirm: false },
  delete_own_file: { minRole: 'user', confirm: true },
  delete_any_file: { minRole: 'admin', confirm: true },
  ban_user: { minRole: 'admin', confirm: true },
  alter_config: { minRole: 'admin', confirm: true },
  financial_op: { minRole: 'admin', confirm: true },
  run_diagnostics: { minRole: 'user', confirm: false },
};

export function rankOf(role: DivinoRole): number {
  return ROLE_RANK[role];
}
