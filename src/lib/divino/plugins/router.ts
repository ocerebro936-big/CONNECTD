// Router: dada a intenção + especialista, escolhe a capacidade a executar.
import type { DivinoAnalysis } from '../types';

export function routeToCapability(analysis: DivinoAnalysis): string | null {
  switch (analysis.intent) {
    case 'storage_issue':
    case 'upload':
      return 'inspect_upload';
    case 'diagnostics':
      return analysis.specialist === 'connected-games' ? 'service_health' : 'connected_health';
    case 'orchestrate':
      return 'connected_orchestrate';
    case 'search_people':
      return 'search_users';
    case 'search_posts':
      return 'search_posts';
    case 'tv':
      return 'list_channels';
    case 'games_ranking':
      return 'retrieve_ranking';
    case 'games_score':
      return 'inspect_score';
    case 'support_ticket':
      return 'ccs_diagnostics'; // placeholder; cria ticket via UI
    case 'economy':
      return 'economy_status';
    case 'memory':
      return 'memory_recall';
    default:
      return null;
  }
}
