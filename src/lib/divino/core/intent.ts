// ============================================================================
// DIVINO IA — Intent Engine
// ----------------------------------------------------------------------------
// Normaliza, deteta idioma, segmenta, extrai intenção, entidades, sentimento,
// objetivo, especialista e referências. Funciona sem LLM (heurística) e pode
// ser refinado por um modelo quando a chave está presente.
// ============================================================================
import type { DivinoAnalysis, DivinoEntity } from '../types';
import { pickSpecialist } from '../knowledge/connected';

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function detectLanguage(text: string): string {
  const t = normalize(text);
  if (/\b(hello|hi|hey|how are you|please)\b/.test(t)) return 'en';
  if (/^(ol[áa]|bom dia|boa tarde|boa noite|obrigad|sim|n[ãa]o|est[áa])/.test(t)) return 'pt';
  return 'pt'; // default MZ/PT
}

function detectSentiment(t: string): DivinoAnalysis['sentiment'] {
  if (/(n[ãa]o (est[áa]|funciona|carrega)|erro|falhou|lento|problema|raiva|p[ée]ssimo|bug)/.test(t)) return 'negativo';
  if (/(obrigad|fixe|bom|gosto|top|adequei|perfeito|obrigada)/.test(t)) return 'positivo';
  return 'neutro';
}

function detectUrgency(t: string): DivinoAnalysis['urgency'] {
  if (/(j[áa] tentei|tr[êe]s vezes|urgente|imediato|r[áa]pido)/.test(t)) return 'alta';
  if (/(n[ãa]o (est[áa]|consigo)|lento|falhou|problema)/.test(t)) return 'media';
  return 'baixa';
}

function detectIntent(t: string): string {
  if (/(carregar|upload|n[ãa]o est[áa] a subir|v[íi]deo n[ãa]o|ficheiro|n[ãa]o envia|tr[êe]s vezes|tentativas)/.test(t))
    return 'storage_issue';
  if (/(diagn[óo]stico|funcionando|verifica|estado|lento|degradado|sa[úu]de)/.test(t)) return 'diagnostics';
  if (/(pessoa|encontrar|quem [ée]|perfil de|utilizador|procurar algu[ée]m)/.test(t)) return 'search_people';
  if (/(publica[çc][ãa]o|post sobre|pesquisar posts|conte[úu]do sobre)/.test(t)) return 'search_posts';
  if (/(tv|canal|v[íi]deo ao vivo|transmiss[ãa]o|live)/.test(t)) return 'tv';
  if (/(ranking|top|quem est[áa] no|classifica[çc][ãa]o)/.test(t)) return 'games_ranking';
  if (/(minha pontua[çc][ãa]o|meus pontos|meu score|quantos pontos)/.test(t)) return 'games_score';
  if (/(problema|ajuda|erro|suporte|ticket|denunciar|reportar|spam)/.test(t)) return 'support_ticket';
  if (/(o que [ée]|como funciona|explica|para que serve|qual [ée])/.test(t)) return 'explain';
  if (/^(ol[áa]|bom dia|boa tarde|oi|hey|salve)/.test(t)) return 'greeting';
  if (/obrigad/.test(t)) return 'thanks';
  return 'general';
}

export function analyzeIntent(text: string): DivinoAnalysis {
  const t = normalize(text);
  const intent = detectIntent(t);
  const { specialist } = pickSpecialist(text);
  const references = ['isso', 'ele', 'ela', 'aquilo', 'l[áa]', 'mesmo']
    .filter((w) => new RegExp(`\\b${w}\\b`).test(t));
  const entities: DivinoEntity[] = [];
  const objMatch = t.match(/(v[íi]deo|ficheiro|foto|imagem|post|m[úu]sica|perfil)/);
  if (objMatch) entities.push({ type: 'objeto', value: objMatch[1] });
  const tries = t.match(/(\d+)\s*(vez|tentativa)/);
  if (tries) entities.push({ type: 'tentativas', value: tries[1] });

  return {
    language: detectLanguage(text),
    intent,
    entities,
    sentiment: detectSentiment(t),
    goal: intent,
    specialist: specialist.id,
    references,
    urgency: detectUrgency(t),
  };
}
