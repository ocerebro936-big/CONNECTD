// ============================================================================
// Connected Channel Finder
// ----------------------------------------------------------------------------
// Descobre e valida fontes públicas e autorizadas para a Connect TV.
// NUNCA retransmite canais sem autorização: o sistema verifica a cadeia
//   URL válida → stream acessível → fonte autorizada → categoria
// antes de um canal entrar no catálogo. Fontes não autorizadas ficam
// pendentes de aprovação da moderação.
// ============================================================================

export type ChannelCategory =
  | '🎬 Filmes'
  | '🎵 Música'
  | '📚 Educação'
  | '📰 Notícias'
  | '⚽ Desporto'
  | '🌍 Cultura'
  | '🎥 Filmes autorizados'
  | '🔴 Lives'
  | '🎙 Podcasts'
  | '📽 Documentários'
  | '📺 Geral';

export type StepStatus = 'pending' | 'ok' | 'warn' | 'fail';

export interface ChannelValidationStep {
  key: 'url' | 'reachable' | 'authorized' | 'category';
  label: string;
  status: StepStatus;
  detail: string;
}

export interface ChannelValidationResult {
  valid: boolean;
  url: string;
  normalized: string;
  domain: string;
  reachable: boolean;
  authorized: boolean;
  requiresModeration: boolean;
  suggestedCategory: ChannelCategory;
  steps: ChannelValidationStep[];
}

// Domínios de fontes públicas/oficialmente disponibilizadas (FAST, oficial,
// domínio público, criativo comum, etc.). São tratados como "autorizados
// conhecidos". Tudo o resto exige aprovação da moderação.
export const AUTHORIZED_DOMAINS: string[] = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
  'twitch.tv',
  'player.twitch.tv',
  'dailymotion.com',
  'www.dailymotion.com',
  'archive.org',
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'commondatastorage.googleapis.com', // amostras públicas do Google
  'storage.googleapis.com',
  'bbc.co.uk',
  'bbc.com',
  'pbs.org',
  'nhk.or.jp',
  'rtve.es',
  'tv5monde.com',
  'france.tv',
  'arte.tv',
  'eurovision.tv',
];

const CATEGORY_HINTS: { test: RegExp; category: ChannelCategory }[] = [
  { test: /(news|noticia|jornal|breaking)/i, category: '📰 Notícias' },
  { test: /(sport|futebol|desporto|match|game)/i, category: '⚽ Desporto' },
  { test: /(music|musica|song|concerto|live set)/i, category: '🎵 Música' },
  { test: /(edu|learn|curso|documentary|documentario|school)/i, category: '📚 Educação' },
  { test: /(movie|filme|cinema|pelicula)/i, category: '🎬 Filmes' },
  { test: /(culture|cultura|travel|viagem|world)/i, category: '🌍 Cultura' },
  { test: /(live|ao vivo|stream)/i, category: '🔴 Lives' },
];

function normalizeUrl(raw: string): { url: string; domain: string; error?: string } {
  let url = raw.trim();
  if (!url) return { url, domain: '', error: 'Introduz um link.' };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url, domain: '', error: 'Apenas http(s) são suportados.' };
    }
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    return { url: parsed.toString(), domain: host };
  } catch {
    return { url, domain: '', error: 'URL inválida.' };
  }
}

function domainAuthorized(domain: string): boolean {
  return AUTHORIZED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

function suggestCategory(url: string, domain: string): ChannelCategory {
  for (const hint of CATEGORY_HINTS) {
    if (hint.test.test(url) || hint.test.test(domain)) return hint.category;
  }
  if (domain.includes('youtube') || domain.includes('vimeo') || domain.includes('twitch')) {
    return '🎵 Música';
  }
  return '📺 Geral';
}

async function checkReachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export async function validateChannelSource(rawUrl: string): Promise<ChannelValidationResult> {
  const steps: ChannelValidationStep[] = [];

  const norm = normalizeUrl(rawUrl);
  if (norm.error || !norm.domain) {
    steps.push({ key: 'url', label: 'URL válida?', status: 'fail', detail: norm.error || 'Domínio não reconhecido.' });
    return {
      valid: false,
      url: norm.url,
      normalized: norm.url,
      domain: norm.domain,
      reachable: false,
      authorized: false,
      requiresModeration: false,
      suggestedCategory: '📺 Geral',
      steps,
    };
  }

  steps.push({ key: 'url', label: 'URL válida?', status: 'ok', detail: `Domínio: ${norm.domain}` });

  const reachable = await checkReachable(norm.url);
  steps.push({
    key: 'reachable',
    label: 'Stream acessível?',
    status: reachable ? 'ok' : 'warn',
    detail: reachable ? 'Fonte respondeu.' : 'Não foi possível confirmar o acesso (pode estar protegida por CORS).',
  });

  const authorized = domainAuthorized(norm.domain);
  steps.push({
    key: 'authorized',
    label: 'Fonte autorizada?',
    status: authorized ? 'ok' : 'warn',
    detail: authorized
      ? 'Fonte pública/oficialmente disponibilizada (autorizada conhecida).'
      : 'Fonte desconhecida — requer autorização da moderação (confirmar direitos de transmissão).',
  });

  const suggestedCategory = suggestCategory(norm.url, norm.domain);
  steps.push({ key: 'category', label: 'Categoria', status: 'ok', detail: `Sugerida: ${suggestedCategory}` });

  const valid = !!norm.domain;
  return {
    valid,
    url: norm.url,
    normalized: norm.url,
    domain: norm.domain,
    reachable,
    authorized,
    requiresModeration: !authorized,
    suggestedCategory,
    steps,
  };
}
