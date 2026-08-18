// ============================================================================
// DIVINO CORE — o cérebro próprio da Connected (Mordomo Digital)
// ----------------------------------------------------------------------------
// Núcleo de orquestração da Connected. Funciona SEM dependência de APIs
// externas: intenções, conhecimento, personalidade, recomendações e respostas
// são decididos aqui, em TypeScript. Um modelo de linguagem (local ou hospedado)
// pode ser ligado opcionalmente via `llm`, mas a lógica principal nunca depende
// dele.
// ============================================================================

export type DivinoIntent =
  | 'greeting'
  | 'help'
  | 'growth_followers'
  | 'discover_people'
  | 'watch_tv'
  | 'create_post'
  | 'improve_profile'
  | 'search'
  | 'privacy'
  | 'about_connected'
  | 'gratitude'
  | 'goodbye'
  | 'fallback';

export interface DivinoQuickAction {
  id: string;
  label: string;
}

export interface DivinoResponse {
  type: 'welcome' | 'assistant' | 'guide';
  text: string;
  quickActions?: DivinoQuickAction[];
}

export interface DivinoUserContext {
  id: string;
  name: string;
  language?: string;
  tags?: string[];
  country?: string;
  followerCount?: number;
  postCount?: number;
  isNew?: boolean;
}

export interface DivinoMessage {
  role: 'user' | 'divino';
  text: string;
  ts?: number;
}

// Modelo de linguagem opcional (local ou hospedado). Se ausente, o core
// responde com a sua própria lógica determinística.
export interface DivinoLlm {
  complete(system: string, history: DivinoMessage[], userText: string): Promise<string>;
}

// Armazenamento de memória pluggável (localStorage por defeito).
export interface DivinoMemoryStore {
  load(userId: string): DivinoMessage[];
  save(userId: string, messages: DivinoMessage[]): void;
}

const GREETINGS = ['olá', 'ola', 'oi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'salve'];
const THANKS = ['obrigado', 'obrigada', 'valeu', 'grato', 'thanks', 'thank you'];
const FAREWELL = ['tchau', 'adeus', 'até', 'fui', 'bye'];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function has(message: string, words: string[]): boolean {
  const m = normalize(message);
  return words.some((w) => m.includes(normalize(w)));
}

const DEFAULT_ACTIONS: DivinoQuickAction[] = [
  { id: 'explorar', label: '🔎 Explorar a Connected King' },
  { id: 'encontrar_pessoas', label: '👥 Encontrar pessoas' },
  { id: 'ver_tv', label: '🎬 Ver vídeos / TV' },
  { id: 'criar_post', label: '✍️ Criar publicação' },
  { id: 'conversar', label: '💬 Conversar comigo' },
];

export class DivinoCore {
  readonly name = 'DIVINO';
  readonly role = 'Mordomo da Connected King';

  private llm?: DivinoLlm;
  private memoryStore?: DivinoMemoryStore;
  private memory = new Map<string, DivinoMessage[]>();

  constructor(opts?: { llm?: DivinoLlm; memoryStore?: DivinoMemoryStore }) {
    this.llm = opts?.llm;
    this.memoryStore = opts?.memoryStore;
  }

  // ---- Memória -------------------------------------------------------------
  private getMemory(userId: string): DivinoMessage[] {
    if (!this.memory.has(userId)) {
      this.memory.set(userId, this.memoryStore?.load(userId) ?? []);
    }
    return this.memory.get(userId)!;
  }

  private pushMemory(userId: string, msg: DivinoMessage) {
    const mem = this.getMemory(userId);
    mem.push({ ...msg, ts: Date.now() });
    if (mem.length > 40) mem.splice(0, mem.length - 40);
    this.memory.set(userId, mem);
    this.memoryStore?.save(userId, mem);
  }

  // ---- API pública --------------------------------------------------------
  initialMessage(user: DivinoUserContext): DivinoResponse {
    return this.welcome(user);
  }

  async respond(user: DivinoUserContext, userText: string): Promise<DivinoResponse> {
    this.pushMemory(user.id, { role: 'user', text: userText });
    const intent = this.detectIntent(userText);
    let response: DivinoResponse;
    switch (intent) {
      case 'greeting':
        response = this.welcome(user);
        break;
      case 'help':
        response = this.help();
        break;
      case 'growth_followers':
        response = this.growthAdvice(user);
        break;
      case 'discover_people':
        response = this.discoverPeople(user);
        break;
      case 'watch_tv':
        response = this.watchTv();
        break;
      case 'create_post':
        response = this.createPost(user);
        break;
      case 'improve_profile':
        response = this.improveProfile(user);
        break;
      case 'search':
        response = this.searchHelp();
        break;
      case 'privacy':
        response = this.privacy();
        break;
      case 'about_connected':
        response = this.aboutConnected();
        break;
      case 'gratitude':
        response = {
          type: 'assistant',
          text: 'Por nada! Estou aqui sempre que precisares. 🌎',
          quickActions: DEFAULT_ACTIONS,
        };
        break;
      case 'goodbye':
        response = {
          type: 'assistant',
          text: 'Até logo! Continua a construir a tua presença na Connected King. 👋',
          quickActions: DEFAULT_ACTIONS,
        };
        break;
      default:
        response = await this.fallback(user, userText);
    }
    this.pushMemory(user.id, { role: 'divino', text: response.text });
    return response;
  }

  // ---- Deteção de intenção ------------------------------------------------
  detectIntent(message: string): DivinoIntent {
    if (has(message, GREETINGS)) return 'greeting';
    if (has(message, FAREWELL)) return 'goodbye';
    if (has(message, THANKS)) return 'gratitude';

    const m = normalize(message);
    if (m.includes('seguidor') || m.includes('seguir') || m.includes('visibilidade') || m.includes('alcance') || m.includes('crescer') || m.includes('fama') || m.includes('conhecido'))
      return 'growth_followers';
    if (m.includes('pessoa') || m.includes('amigo') || m.includes('conhecer') || m.includes('rede') || m.includes('comunidade'))
      return 'discover_people';
    if (m.includes('tv') || m.includes('video') || m.includes('filme') || m.includes('assistir') || m.includes('canal') || m.includes('live'))
      return 'watch_tv';
    if (m.includes('publicar') || m.includes('post') || m.includes('criar') || m.includes('conteudo') || m.includes('foto') || m.includes('partilhar'))
      return 'create_post';
    if (m.includes('perfil') || m.includes('bio') || m.includes('foto de perfil') || m.includes('apresentar'))
      return 'improve_profile';
    if (m.includes('privacidade') || m.includes('privado') || m.includes('seguranca') || m.includes('dados') || m.includes('protegido'))
      return 'privacy';
    if (m.includes('pesquisar') || m.includes('procurar') || m.includes('busca') || m.includes('achar'))
      return 'search';
    if (m.includes('connected') || m.includes('rede social') || m.includes('o que e') || m.includes('sobre'))
      return 'about_connected';
    if (m.includes('ajuda') || m.includes('help') || m.includes('como') || m.includes('o que posso'))
      return 'help';
    return 'fallback';
  }

  // ---- Respostas base (conhecimento da Connected) -------------------------
  welcome(user: DivinoUserContext): DivinoResponse {
    const name = user.name?.split(' ')[0] || 'amigo';
    return {
      type: 'welcome',
      text:
        `Olá ${name}! 👑 Eu sou o DIVINO, o mordomo inteligente da Connected King.\n` +
        `Seja muito bem-vindo! 🌎 Posso ajudar-te a conhecer a Connected King, ` +
        `encontrar pessoas, descobrir conteúdos, publicar, organizar o teu perfil e tirar dúvidas.\n\n` +
        `O que gostarias de fazer primeiro?`,
      quickActions: DEFAULT_ACTIONS,
    };
  }

  help(): DivinoResponse {
    return {
      type: 'guide',
      text:
        'Posso ajudar com várias coisas dentro da Connected King. Alguns exemplos:\n' +
        '• 🔎 Explorar a Connect TV e vídeos\n' +
        '• 👥 Encontrar pessoas com interesses parecidos\n' +
        '• ✍️ Criar e otimizar publicações\n' +
        '• 📈 Melhorar o teu perfil e alcance\n' +
        '• 🔐 Explicar privacidade e segurança\n' +
        '• 💬 Responder dúvidas sobre a Connected King\n\n' +
        'É só escrever o que precisas.',
      quickActions: DEFAULT_ACTIONS,
    };
  }

  aboutConnected(): DivinoResponse {
    return {
      type: 'assistant',
      text:
        'A Connected King é um ecossistema social e digital onde podes ligar-te a pessoas, ' +
        'publicar fotos/vídeos/áudio/documentos, assistir à Connect TV, jogar, ' +
        'comprar e vender, e usar serviços com a ajuda do DIVINO. ' +
        'Tudo passa pelo Connected King Cloud (armazenamento próprio) para que o que ' +
        'ves na interface exista mesmo no backend.',
      quickActions: DEFAULT_ACTIONS,
    };
  }

  watchTv(): DivinoResponse {
    return {
      type: 'guide',
      text:
        'A Connect TV tem canais integrados e fontes externas autorizadas (nunca ' +
        'retransmitimos sem permissão). Podes pedir para eu abrir a TV ou procurar ' +
        'um canal autorizado.',
      quickActions: [
        { id: 'ver_tv', label: '🎬 Abrir Connect TV' },
        { id: 'encontrar_pessoas', label: '👥 Encontrar pessoas' },
        { id: 'explorar', label: '🔎 Explorar' },
      ],
    };
  }

  createPost(user: DivinoUserContext): DivinoResponse {
    return {
      type: 'guide',
      text:
        `Claro, ${user.name?.split(' ')[0] || 'amigo'}! Vou abrir o composer para ti. ` +
        `Dica do DIVINO: publicações com uma boa imagem e uma descrição clara ganham ` +
        `muito mais descoberta. Queres que eu te ajude a escrever a legenda?`,
      quickActions: [
        { id: 'criar_post', label: '✍️ Abrir publicação' },
        { id: 'improve_profile', label: '🚀 Melhorar perfil' },
        { id: 'growth_followers', label: '📈 Aumentar alcance' },
      ],
    };
  }

  discoverPeople(user: DivinoUserContext): DivinoResponse {
    return {
      type: 'guide',
      text:
        'Vou mostrar-te "Pessoas que talvez conheças" — perfis com interesses ou ' +
        'origem parecidos com os teus. Seguir pessoas certas é o primeiro passo para ' +
        'a Connected trabalhar por ti na descoberta.',
      quickActions: [
        { id: 'encontrar_pessoas', label: '👥 Ver sugestões' },
        { id: 'growth_followers', label: '📈 Como crescer' },
      ],
    };
  }

  privacy(): DivinoResponse {
    return {
      type: 'assistant',
      text:
        'A tua privacidade importa. O DIVINO usa apenas o teu perfil público e as ' +
        'tuas publicações públicas para te ajudar. Mensagens privadas, ficheiros ' +
        'privados e dados protegidos NUNCA são usados como conhecimento meu, e as ' +
        'nossas conversas ficam apenas contigo. Se quiseres, podes limpar a memória ' +
        'da nossa conversa a qualquer momento.',
      quickActions: [
        { id: 'explorar', label: '🔎 Explorar' },
        { id: 'conversar', label: '💬 Continuar' },
      ],
    };
  }

  searchHelp(): DivinoResponse {
    return {
      type: 'guide',
      text:
        'Podes usar a pesquisa no topo da Connected para encontrar pessoas, conteúdos ' +
        'e comunidades. Eu também ajudo: diz-me o tema e mostro sugestões e pessoas ' +
        'relacionadas.',
      quickActions: DEFAULT_ACTIONS,
    };
  }

  improveProfile(user: DivinoUserContext): DivinoResponse {
    const missing: string[] = [];
    if (!user.tags || user.tags.length === 0) missing.push('adicionar os teus interesses');
    if (user.followerCount === 0) missing.push('seguir algumas pessoas');
    if (user.postCount === 0) missing.push('fazer a tua primeira publicação');
    const text = missing.length
      ? `Para um perfil forte, recomendo: ${missing
          .map((m, i) => `${i + 1}. ${m}`)
          .join('; ')}.`
      : 'O teu perfil já tem boa base! Mantém a consistência nas publicações.';
    return {
      type: 'guide',
      text:
        `${text}\n\nUm perfil completo e autêntico é o que o algoritmo de visibilidade ` +
        `recompensa — qualidade, não quantidade de seguidores.`,
      quickActions: [
        { id: 'encontrar_pessoas', label: '👥 Encontrar pessoas' },
        { id: 'criar_post', label: '✍️ Criar publicação' },
        { id: 'growth_followers', label: '📈 Aumentar alcance' },
      ],
    };
  }

  // ---- Conselho de crescimento personalizado ------------------------------
  growthAdvice(user: DivinoUserContext): DivinoResponse {
    const interests = (user.tags || []).filter(Boolean);
    const strong = interests.length
      ? interests.slice(0, 3).map((t) => t.trim()).join(', ')
      : 'ainda por definir';
    const steps: string[] = [];
    let n = 1;
    if (!user.tags || user.tags.length === 0) steps.push(`${n++}. definir os teus interesses no perfil`);
    if (user.followerCount === 0) steps.push(`${n++}. seguir 5–10 pessoas com temas parecidos`);
    if (user.postCount === 0) steps.push(`${n++}. publicar o teu primeiro conteúdo`);
    else steps.push(`${n++}. publicar conteúdo regular e com boa descrição`);
    steps.push(`${n++}. participar em comunidades relacionadas`);
    steps.push(`${n++}. conectar-te com criadores semelhantes`);

    const text =
      `Não prometo seguidores falsos — isso não ajuda ninguém. ` +
      `Mas analisei dados legítimos e o teu perfil já tem pontos fortes: ${strong}.\n\n` +
      `Encontrei pessoas na Connected interessadas nesses temas. Recomendo:\n` +
      steps.map((s) => `**${s}**`).join('\n') +
      `\n\nQueres que eu prepare uma publicação para ti?`;

    return {
      type: 'guide',
      text,
      quickActions: [
        { id: 'criar_post', label: '✍️ Criar publicação' },
        { id: 'encontrar_pessoas', label: '👥 Ver pessoas' },
        { id: 'improve_profile', label: '🚀 Melhorar perfil' },
      ],
    };
  }

  // ---- Fallback (com LLM opcional) ---------------------------------------
  private async fallback(user: DivinoUserContext, userText: string): Promise<DivinoResponse> {
    if (this.llm) {
      try {
        const system = this.buildSystemPrompt(user);
        const history = this.getMemory(user.id).slice(-12);
        const text = await this.llm.complete(system, history, userText);
        if (text && text.trim().length > 0) {
          return { type: 'assistant', text, quickActions: DEFAULT_ACTIONS };
        }
      } catch {
        /* cai no fallback determinístico */
      }
    }
    return {
      type: 'assistant',
      text:
        `Entendi, ${user.name?.split(' ')[0] || 'amigo'}. ` +
        `Estou aqui para ajudar dentro das funções da Connected King. ` +
        `Podes pedir para explorar, encontrar pessoas, criar publicações, ` +
        `melhorar o perfil ou aumentar o teu alcance.`,
      quickActions: DEFAULT_ACTIONS,
    };
  }

  buildSystemPrompt(user: DivinoUserContext): string {
    return [
      `És o DIVINO, o mordomo digital da Connected, uma rede social e ecossistema digital.`,
      `Falas português de forma calorosa, útil e concisa.`,
      `Nunca inventas seguidores ou prometes resultados falsos.`,
      `Ajudas o utilizador a crescer de forma legítima (perfil, conteúdo, descoberta).`,
      `Respeitas a privacidade: não usas dados privados.`,
      `Utilizador: ${user.name}. Interesses: ${(user.tags || []).join(', ') || 'não definidos'}.`,
    ].join('\n');
  }

  clearMemory(userId: string) {
    this.memory.set(userId, []);
    this.memoryStore?.save(userId, []);
  }
}

// Memória em localStorage (privada por utilizador, sem sair do dispositivo).
export const localStorageMemory: DivinoMemoryStore = {
  load(userId) {
    try {
      const raw = localStorage.getItem(`divino_memory_${userId}`);
      return raw ? (JSON.parse(raw) as DivinoMessage[]) : [];
    } catch {
      return [];
    }
  },
  save(userId, messages) {
    try {
      localStorage.setItem(`divino_memory_${userId}`, JSON.stringify(messages));
    } catch {
      /* ignora quota */
    }
  },
};

export const divino = new DivinoCore({ memoryStore: localStorageMemory });
