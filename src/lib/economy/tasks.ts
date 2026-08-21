// ============================================================================
// Connected Economy — Missões diárias
// ----------------------------------------------------------------------------
// Missões derivam de ações legítimas já registadas (publicar, entrar, convidar,
// jogar). O prémio só é pago uma vez por dia e depois de a ação acontecer.
// ============================================================================
import { awardCustomPoints, getHistory } from './engine';
import type { WalletTx } from './types';

export interface DailyMission {
  id: string;
  label: string;
  reward: number;
  done: boolean; // ação ocorreu hoje
  claimed: boolean; // prémio já recebido hoje
}

const MISSIONS: { id: string; label: string; reward: number; action: string }[] = [
  { id: 'mission_publish', label: 'Publicar uma foto ou vídeo', reward: 20, action: 'publish' },
  { id: 'mission_login', label: 'Entrar na Connected King hoje', reward: 10, action: 'daily_login' },
  { id: 'mission_invite', label: 'Convidar um amigo ativo', reward: 150, action: 'invite' },
  { id: 'mission_run', label: 'Jogar Connected RUN (corrida)', reward: 50, action: 'run_race' },
];

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function getDailyMissions(uid: string): Promise<DailyMission[]> {
  let tx: WalletTx[] = [];
  try {
    tx = await getHistory(uid, 200);
  } catch {
    tx = [];
  }
  const today = startOfToday();
  const dk = dayKey();
  return MISSIONS.map((m) => {
    const done = tx.some((t) => t.reason === m.action && (t.createdAt || 0) >= today);
    const claimed = tx.some((t) => t.type === 'mission' && t.ref === `mission_${m.id}_${dk}`);
    return { id: m.id, label: m.label, reward: m.reward, done, claimed };
  });
}

export async function claimMission(uid: string, id: string): Promise<{ ok: boolean; amount: number }> {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return { ok: false, amount: 0 };
  const dk = dayKey();
  const res = await awardCustomPoints(uid, m.reward, `mission:${m.label}`, `mission_${id}_${dk}`);
  return { ok: res.awarded, amount: res.amount };
}
