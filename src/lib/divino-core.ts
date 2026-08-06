export type MemoryLayer = 'user' | 'platform' | 'admin' | 'knowledge';

export interface DivinoModel {
  id: string;
  name: string;
  owner: string;
  kind: 'external' | 'local';
  description: string;
  requiresKey: boolean;
}

export const DIVINO_MODELS: DivinoModel[] = [
  {
    id: 'divino-core',
    name: 'DIVINO Core',
    owner: 'Bluewhite Corporation Lda.',
    kind: 'local',
    description: 'Motor local com base de conhecimento e memória. Funciona sem chaves externas.',
    requiresKey: false,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    owner: 'Google LLC (externo)',
    kind: 'external',
    description: 'Modelo de linguagem externo opcional. Requer chave da API fornecida pelo utilizador.',
    requiresKey: true,
  },
];

export interface KnowledgeItem {
  category: string;
  title: string;
  keywords: string[];
  answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    category: '📚 Interna',
    title: 'Pontos da plataforma',
    keywords: ['ponto', 'pontos', 'ganhar', 'nível', 'níveis', 'xp', 'reputação'],
    answer: 'Ganha-se pontos publicando conteúdo (+20), comentários úteis (+5) e imagens educativas (+15). Os níveis vão de Novo Membro (Nv.1) até Lenda Connected (Nv.10). Níveis reduzem o custo das chamadas e desbloqueiam cargos.',
  },
  {
    category: '📚 Interna',
    title: 'Avaliação 0-10',
    keywords: ['avalia', 'avaliação', 'estrela', 'estrelas', 'rating', 'nota', 'classificação'],
    answer: 'Cada publicação é avaliada de 0 a 10 pontos. Podes atribuir uma nota por publicação e alterá-la quando quiseres. A média aparece no feed com o número de avaliações.',
  },
  {
    category: '📚 Interna',
    title: 'Cargos de emprego',
    keywords: ['cargo', 'carreira', 'emprego', 'trabalho', 'moderador', 'curador', 'líder', 'vaga'],
    answer: 'Existem cargos como Moderador Comunitário (Nv.3, 500pts), Curador de Conteúdo (Nv.5, 1500pts) e Líder de Comunidade (Nv.8, 5000pts). Candidata-te na aba Dashboard > Quero Trabalhar.',
  },
  {
    category: '📚 Interna',
    title: 'Chamadas WebRTC',
    keywords: ['chamada', 'chamadas', 'webrtc', 'vídeo', 'voz', 'telecom', 'ligação'],
    answer: 'Chamadas WebRTC consomem 10 pontos por minuto com qualidade adaptativa. Utilizadores de níveis mais altos pagam menos. Inicia chamadas na aba Networking.',
  },
  {
    category: '📚 Interna',
    title: 'Connect TV e Jukebox',
    keywords: ['connect tv', 'jukebox', 'tv', 'vídeo', 'transmissão', 'fila'],
    answer: 'A Connect TV é uma fila colaborativa de vídeos. Envia um link do YouTube na aba Connect TV para adicionares à fila. Curadores de Nv.5+ podem destacar vídeos.',
  },
  {
    category: '📚 Interna',
    title: 'Galeria e Museu',
    keywords: ['galeria', 'museu', 'loja', 'compra', 'vender', 'direitos autorais', 'licença'],
    answer: 'A Galeria tem 3 sub-abas: Galeria (fotos/reels), Museu Dinâmico (Hall da Fama) e Direitos Autorais (marketplace de licenças em MZN). O checkout aceita PayPal, Google Pay, MetaMask e transferência bancária.',
  },
  {
    category: '📚 Interna',
    title: 'Temperatura do conteúdo',
    keywords: ['temperatura', 'quente', 'frio', 'engajamento', 'fogo', 'thermal'],
    answer: 'A temperatura mede o engajamento: 🔵 FRIO (<20), 🟢 MORNO (20-49), 🟠 QUENTE (50-99) e 🔥 EM FOGO (100+). Conteúdo em fogo ganha destaque no feed.',
  },
  {
    category: '📚 Interna',
    title: 'Games Online',
    keywords: ['jogo', 'jogos', 'game', 'games', 'arcade'],
    answer: 'A aba Games Online é o diretório de jogos do navegador da Connected, com categorias como Puzzle, Corrida, Desporto e Multiplayer. Jogos incorporáveis abrem em iframe; os restantes abrem no site oficial.',
  },
  {
    category: '📚 Interna',
    title: 'Amizades e conexões',
    keywords: ['amigo', 'amizade', 'amigos', 'conexão', 'pedido', 'seguir', 'seguidores'],
    answer: 'O sistema de amizades funciona com pedidos reais: envia, aceita ou recusa pedidos na aba Conexões. A compatibilidade é calculada com base em interesses partilhados e reputação.',
  },
  {
    category: '⚖️ Jurídica',
    title: 'Propriedade da plataforma',
    keywords: ['bluewhite', 'proprietário', 'empresa', 'corporation', 'dono'],
    answer: 'A Connected Platform é operada pela Bluewhite Corporation Lda. O DIVINO IA é o núcleo inteligente da plataforma, com toda a lógica sob o controlo da empresa.',
  },
  {
    category: '⚖️ Jurídica',
    title: 'Segurança e privacidade',
    keywords: ['segurança', 'privacidade', 'dados', 'dados pessoais', 'auditoria', 'proteção'],
    answer: 'A plataforma regista eventos de segurança, utiliza autenticação segura e respeita as regulações de proteção de dados. Os teus dados pessoais são tratados de acordo com os Termos de Serviço.',
  },
  {
    category: '💡 Técnica',
    title: 'Acesso e domínios',
    keywords: ['domínio', 'domínio', 'link', 'url', 'acesso', 'login'],
    answer: 'Acede pela URL oficial https://www.connected.org-github.io/. O login aceita Google, Microsoft, Yahoo, Email e Modo Convidado. Domínios autorizados estão configurados no Firebase.',
  },
  {
    category: '💡 Técnica',
    title: 'Modo Convidado',
    keywords: ['convidado', 'sem conta', 'explorar', 'demo', 'teste'],
    answer: 'O Modo Convidado permite explorar a plataforma sem criar conta. Para publicar, avaliar ou conversar, cria conta com Email ou entra com Google.',
  },
  {
    category: '💡 Técnica',
    title: 'Fundo e aparência',
    keywords: ['fundo', 'tema', 'aparência', 'cores', 'fundo dinâmico', 'rotação'],
    answer: 'Nas Definições > Aparência & Fundo podes escolher categorias (Universo, Natureza, Tecnologia...), definir um favorito e ativar rotação automática com intervalo configurável.',
  },
];

export interface MemoryEntry {
  layer: MemoryLayer;
  key: string;
  value: string;
  updatedAt: number;
}

const MEMORY_KEY = 'divino_memory_long_term';

function loadMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMemory(entries: MemoryEntry[]) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(entries));
  } catch {}
}

export function remember(layer: MemoryLayer, key: string, value: string) {
  const entries = loadMemory().filter(e => !(e.layer === layer && e.key === key));
  entries.push({ layer, key, value, updatedAt: Date.now() });
  saveMemory(entries);
}

export function recall(layer: MemoryLayer, key: string): string | null {
  const entry = loadMemory().find(e => e.layer === layer && e.key === key);
  return entry ? entry.value : null;
}

export function getMemoryByLayer(layer: MemoryLayer): MemoryEntry[] {
  return loadMemory().filter(e => e.layer === layer);
}

export function clearMemoryLayer(layer: MemoryLayer) {
  saveMemory(loadMemory().filter(e => e.layer !== layer));
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function searchKnowledge(query: string): KnowledgeItem | null {
  const q = normalize(query);
  let best: KnowledgeItem | null = null;
  let bestScore = 0;
  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      const nk = normalize(kw);
      if (q.includes(nk)) score += 10;
      else if (nk.split(' ').some(w => w.length > 3 && q.includes(w))) score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 10 ? best : null;
}

export interface DivinoResponse {
  text: string;
  source: 'knowledge' | 'memory' | 'model' | 'fallback';
  modelUsed: string;
}

const FALLBACKS = [
  'O DIVINO IA está a meditar sobre essa questão. Podes reformular de outra forma? Também posso explicar os pontos, cargos, Connect TV, Galeria, Games ou avaliações 0-10.',
  'O meu conhecimento da Connected é vasto, mas essa questão escapa ao meu alcance atual. Pergunta sobre pontos, níveis, chamadas, Galeria, Connect TV ou avaliações.',
  'Sou o DIVINO IA da Bluewhite Corporation. Conheço bem a plataforma Connected — experimenta perguntar sobre avaliações 0-10, modos de login ou como ganhar pontos.',
];

let fallbackIndex = 0;

export function divinoLocalReply(query: string, userName?: string, modelId = 'divino-core'): DivinoResponse {
  const kb = searchKnowledge(query);
  if (kb) {
    return {
      text: kb.answer,
      source: 'knowledge',
      modelUsed: modelId,
    };
  }

  const greeting = /^(ol[áa]|boa|bom|oi|hey|salve|viva)/i.test(query.trim());
  const thanks = /obrigad[oa]|agradec/i.test(query);
  const name = /como te chamas|quem [é]s|o que [é]s|identidade/i.test(query);

  if (name) {
    return {
      text: 'Sou o DIVINO IA, o núcleo inteligente da Connected, criado e controlado pela Bluewhite Corporation Lda. Posso responder sobre a plataforma, ajudar com o conhecimento interno e orientar-te no ecossistema.',
      source: 'knowledge',
      modelUsed: modelId,
    };
  }

  if (greeting) {
    const storedName = userName || recall('user', 'displayName') || 'membro';
    return {
      text: `Saudações, ${storedName}! Sou o DIVINO IA, o oráculo da Connected. Em que posso ajudar? Posso falar sobre pontos, níveis, cargos, Connect TV, Galeria, Games ou avaliações.`,
      source: 'knowledge',
      modelUsed: modelId,
    };
  }

  if (thanks) {
    return {
      text: 'De nada! Estou sempre aqui para orientar o ecossistema Connected. Que mais queres saber?',
      source: 'knowledge',
      modelUsed: modelId,
    };
  }

  return {
    text: FALLBACKS[fallbackIndex++ % FALLBACKS.length],
    source: 'fallback',
    modelUsed: modelId,
  };
}

export async function divinoChat(
  messages: { role: string; text: string }[],
  opts: { modelId: string; apiKey?: string; userName?: string }
): Promise<DivinoResponse> {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const query = lastUser?.text || '';

  if (opts.modelId === 'divino-core' || !opts.apiKey) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return divinoLocalReply(query, opts.userName, 'divino-core');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.modelId}:generateContent?key=${opts.apiKey}`;
    const contents = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'Tu és o DIVINO IA, o núcleo inteligente da Connected, criado pela Bluewhite Corporation Lda. Responde em português de Portugal, de forma útil e oracular.',
          }],
        },
        contents,
        generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 800 },
      }),
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 403 || status === 400) {
        return { text: 'A chave Gemini é inválida ou sem permissão. Ativa o DIVINO Core local ou verifica a chave.', source: 'fallback', modelUsed: 'gemini' };
      }
      throw new Error(`API ${status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return {
      text: typeof text === 'string' && text ? text : 'O DIVINO IA reflete em silêncio...',
      source: 'model',
      modelUsed: opts.modelId,
    };
  } catch {
    return divinoLocalReply(query, opts.userName, 'divino-core');
  }
}
