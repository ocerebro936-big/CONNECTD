// ============================================================================
// Connected Economy — Tasks / Missões diárias
// ============================================================================
import { applyEvent } from './rewards';
import { listTransactions } from './ledger';

export interface DailyMission {
  id: string;
  label: string;
  reward: number;
  done: boolean;
  claimed: boolean;
}

const MISSIONS: { id: string; label: string; reward: number; event: string }[] = [
  { id: 'mission_publish', label: 'Publicar uma foto ou vídeo', reward: 10, event: 'CONTENT_PUBLISHED' },
  { id: 'mission_login', label: 'Entrar na Connected King hoje', reward: 5, event: 'DAILY_LOGIN' },
  { id: 'mission_invite', label: 'Convidar um amigo ativo', reward: 100, event: 'REFERRAL_COMPLETED' },
  { id: 'mission_run', label: 'Jogar Connected RUN (corrida)', reward: 3, event: 'GAME_PLAYED' },
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
  let txs = [];
  try {
    txs = await listTransactions(uid, 200);
  } catch {
    txs = [];
  }
  const today = startOfToday();
  const dk = dayKey();
  return MISSIONS.map((m) => {
    const done = txs.some((t) => t.source === m.event && (new Date(t.createdAt).getTime()) >= today);
    const claimed = txs.some((t) => t.type === 'reward' && t.source === `mission:${m.id}:${dk}`);
    return { id: m.id, label: m.label, reward: m.reward, done, claimed };
  });
}

export async function claimMission(uid: string, id: string): Promise<{ ok: boolean; amount: number }> {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return { ok: false, amount: 0 };
  const dk = dayKey();
  const res = await applyEvent(uid, m.event, { ref: `mission:${id}:${dk}` });
  return { ok: res.awarded, amount: res.amount };
}
