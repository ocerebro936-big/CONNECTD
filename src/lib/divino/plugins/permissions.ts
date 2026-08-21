// Mapeia cada capacidade à ação de autoridade necessária.
import type { DivinoAction } from '../security/policy';

export const CAPABILITY_ACTION: Record<string, DivinoAction> = {
  inspect_upload: 'inspect_own_storage',
  inspect_storage: 'inspect_own_storage',
  inspect_quota: 'read_own_data',
  ccs_diagnostics: 'run_diagnostics',
  search_users: 'read_public',
  search_posts: 'read_public',
  list_channels: 'read_public',
  retrieve_ranking: 'read_public',
  inspect_score: 'read_own_data',
  service_health: 'run_diagnostics',
  economy_status: 'read_own_data',
  memory_status: 'read_own_data',
  memory_recall: 'read_own_data',
  memory_context: 'read_own_data',
  memory_summarize: 'read_own_data',
  memory_preference: 'read_own_data',
};
