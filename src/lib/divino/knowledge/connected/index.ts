// ============================================================================
// Especialistas próprios da Connected King (registry de disciplinas).
// Cada especialista tem capacidades que mapeiam para ferramentas reais.
// ============================================================================
import type { SpecialistId } from '../../types';

export interface ConnectedSpecialist {
  id: SpecialistId;
  name: string;
  description: string;
  capabilities: string[];
  keywords: string[];
}

export const CONNECTED_SPECIALISTS: ConnectedSpecialist[] = [
  {
    id: 'connected-cloud',
    name: 'Connected Cloud',
    description: 'Armazenamento próprio, upload, derivados, quota e diagnóstico de mídia.',
    capabilities: ['inspect_upload', 'inspect_storage', 'inspect_quota', 'ccs_diagnostics'],
    keywords: ['upload', 'storage', 'armazenamento', 'ccs', 'ficheiro', 'vídeo', 'quota', 'cloud', 'download'],
  },
  {
    id: 'connected-social',
    name: 'Connected Social',
    description: 'Feed, utilizadores, seguidores, mensagens e descoberta.',
    capabilities: ['find_account', 'search_posts', 'search_users', 'explain_service'],
    keywords: ['seguidor', 'perfil', 'post', 'feed', 'mensagem', 'amigo', 'utilizador', 'pessoa'],
  },
  {
    id: 'connected-tv',
    name: 'Connected TV',
    description: 'Canais, transmissões e fila de vídeos.',
    capabilities: ['list_channels', 'explain_service'],
    keywords: ['tv', 'canal', 'vídeo', 'live', 'transmissão', 'jukebox'],
  },
  {
    id: 'connected-games',
    name: 'Connected Games',
    description: 'Connected RUN e ranking de jogadores.',
    capabilities: ['inspect_score', 'explain_level', 'retrieve_ranking'],
    keywords: ['jogo', 'run', 'pontos', 'ranking', 'nível', 'game', 'score'],
  },
  {
    id: 'connected-marketplace',
    name: 'Connected Marketplace',
    description: 'Galeria, museu e licenças de direitos autorais.',
    capabilities: ['explain_service'],
    keywords: ['galeria', 'museu', 'vender', 'licença', 'direitos', 'compra', 'marketplace'],
  },
  {
    id: 'connected-wallet',
    name: 'Connected Wallet',
    description: 'BlueCoin, pagamentos e transações.',
    capabilities: ['explain_service'],
    keywords: ['bluecoin', 'carteira', 'pagamento', 'saldo', 'transação', 'wallet'],
  },
  {
    id: 'connected-ads',
    name: 'Connected Ads',
    description: 'Campanhas e publicidade.',
    capabilities: ['explain_service'],
    keywords: ['anúncio', 'ads', 'campanha', 'publicidade', 'promover'],
  },
  {
    id: 'connected-jobs',
    name: 'Connected Jobs',
    description: 'Emprego, cargos e recrutamento.',
    capabilities: ['explain_service'],
    keywords: ['emprego', 'trabalho', 'vaga', 'cargo', 'recrutamento', 'jobs'],
  },
  {
    id: 'connected-ai',
    name: 'Connected AI',
    description: 'O próprio DIVINO e ferramentas de IA.',
    capabilities: ['explain_service'],
    keywords: ['ia', 'divino', 'inteligência', 'ai', 'modelo'],
  },
  {
    id: 'connected-security',
    name: 'Connected Security',
    description: 'Segurança, privacidade e moderação.',
    capabilities: ['create_ticket', 'explain_service'],
    keywords: ['segurança', 'privacidade', 'denúncia', 'spam', 'ban', 'moderação'],
  },
  {
    id: 'connected-analytics',
    name: 'Connected Analytics',
    description: 'Métricas de alcance e engajamento.',
    capabilities: ['explain_service'],
    keywords: ['analytics', 'métricas', 'alcance', 'engajamento', 'estatística'],
  },
];

const GENERAL: ConnectedSpecialist[] = [
  {
    id: 'general-knowledge',
    name: 'Conhecimento Geral',
    description: 'Matemática, ciências, história, filosofia e educação.',
    capabilities: ['answer'],
    keywords: ['matemática', 'física', 'história', 'química', 'biologia', 'filosofia'],
  },
  {
    id: 'business',
    name: 'Negócios',
    description: 'Marketing, finanças, gestão e empreendedorismo.',
    capabilities: ['answer'],
    keywords: ['marketing', 'vendas', 'finanças', 'empresa', 'negócio', 'estratégia'],
  },
  {
    id: 'technology',
    name: 'Tecnologia',
    description: 'Programação, cloud, cybersecurity, DevOps e IA.',
    capabilities: ['answer'],
    keywords: ['programação', 'código', 'software', 'cloud', 'api', 'devops', 'cyber'],
  },
  {
    id: 'creativity',
    name: 'Criatividade',
    description: 'Música, design, escrita e roteiros.',
    capabilities: ['answer'],
    keywords: ['música', 'design', 'escrita', 'roteiro', 'criativo', 'branding'],
  },
  {
    id: 'science',
    name: 'Ciência',
    description: 'Física, química, biologia e geografia.',
    capabilities: ['answer'],
    keywords: ['ciência', 'universo', 'natureza', 'experiência'],
  },
];

export const ALL_SPECIALISTS = [...CONNECTED_SPECIALISTS, ...GENERAL];

export function pickSpecialist(text: string): { specialist: ConnectedSpecialist; score: number } {
  const q = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let best = CONNECTED_SPECIALISTS[0];
  let bestScore = 0;
  for (const s of ALL_SPECIALISTS) {
    let score = 0;
    for (const kw of s.keywords) {
      if (q.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return { specialist: best, score: bestScore };
}
