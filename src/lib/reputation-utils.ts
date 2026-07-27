export type UserRole = 'user' | 'moderator' | 'curator' | 'leader' | 'admin';

export interface LevelInfo {
  level: number;
  title: string;
  role: UserRole | null;
  minPoints: number;
  color: string;
  badge: string;
  callCostPerMin: number;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Novo Membro', role: null, minPoints: 0, color: 'text-slate-400', badge: 'bg-slate-500', callCostPerMin: 20 },
  { level: 2, title: 'Contribuidor', role: null, minPoints: 100, color: 'text-emerald-400', badge: 'bg-emerald-500', callCostPerMin: 18 },
  { level: 3, title: 'Membro Ativo', role: 'moderator', minPoints: 500, color: 'text-blue-400', badge: 'bg-blue-500', callCostPerMin: 15 },
  { level: 4, title: 'Criador de Valor', role: null, minPoints: 1000, color: 'text-purple-400', badge: 'bg-purple-500', callCostPerMin: 12 },
  { level: 5, title: 'Curador', role: 'curator', minPoints: 1500, color: 'text-amber-400', badge: 'bg-amber-500', callCostPerMin: 10 },
  { level: 6, title: 'Especialista', role: null, minPoints: 2500, color: 'text-rose-400', badge: 'bg-rose-500', callCostPerMin: 8 },
  { level: 7, title: 'Líder Comunitário', role: null, minPoints: 4000, color: 'text-cyan-400', badge: 'bg-cyan-500', callCostPerMin: 5 },
  { level: 8, title: 'Líder de Comunidade', role: 'leader', minPoints: 5000, color: 'text-yellow-400', badge: 'bg-yellow-500', callCostPerMin: 3 },
  { level: 9, title: 'Embaixador', role: null, minPoints: 8000, color: 'text-orange-400', badge: 'bg-orange-500', callCostPerMin: 1 },
  { level: 10, title: 'Lenda Connected', role: null, minPoints: 12000, color: 'text-pink-400', badge: 'bg-gradient-to-r from-pink-500 to-purple-600', callCostPerMin: 0 },
];

export function getLevel(points: number): LevelInfo {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(points: number): LevelInfo | null {
  for (const level of LEVELS) {
    if (points < level.minPoints) return level;
  }
  return null;
}

export function getLevelProgress(points: number): { current: LevelInfo; next: LevelInfo | null; progress: number } {
  const current = getLevel(points);
  const next = getNextLevel(points);
  if (!next) return { current, next: null, progress: 100 };
  const range = next.minPoints - current.minPoints;
  const progress = ((points - current.minPoints) / range) * 100;
  return { current, next, progress: Math.min(progress, 100) };
}

export function calculatePointsForPost(contentLength: number, hasImage: boolean): number {
  let points = 5;
  if (contentLength > 100) points += 10;
  if (contentLength > 250) points += 20;
  if (contentLength > 500) points += 30;
  if (hasImage) points += 15;
  return points;
}

export function calculatePointsForComment(contentLength: number): number {
  if (contentLength > 50) return 5;
  if (contentLength > 20) return 3;
  return 1;
}

export const CALL_COST_PER_MIN = 10;
export const SMS_COST = 2;

export interface JobRole {
  title: string;
  level: number;
  minPoints: number;
  description: string;
  responsibilities: string[];
  compensation: string;
  icon: string;
}

export const JOB_ROLES: JobRole[] = [
  {
    title: 'Moderador Comunitário',
    level: 3,
    minPoints: 500,
    description: 'Manter o respeito no Live Chat da TV e filtrar posts de valor.',
    responsibilities: [
      'Moderar o chat ao vivo da Connect TV',
      'Filtrar e sinalizar conteúdo impróprio',
      'Ajudar novos membros na plataforma',
    ],
    compensation: 'Saldo ilimitado de chamadas + Ajudas de custo',
    icon: '🛡️',
  },
  {
    title: 'Curador de Conteúdo',
    level: 5,
    minPoints: 1500,
    description: 'Selecionar os melhores vídeos para a Jukebox da Connect TV.',
    responsibilities: [
      'Curar a fila da Connect TV',
      'Selecionar conteúdo em destaque no Feed',
      'Organizar playlists temáticas semanais',
    ],
    compensation: 'Remuneração por hora / Posição na equipa',
    icon: '🎯',
  },
  {
    title: 'Líder de Comunidade',
    level: 8,
    minPoints: 5000,
    description: 'Gerir hubs regionais e organizar iniciativas de impacto social.',
    responsibilities: [
      'Organizar eventos regionais e online',
      'Gerir equipa de moderadores',
      'Representar a Connected na sua região',
    ],
    compensation: 'Contrato de Trabalho / Cargo Executivo',
    icon: '👑',
  },
];
