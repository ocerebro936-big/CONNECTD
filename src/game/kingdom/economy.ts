// Connected RUN: KINGDOM — economia interna (virtual, separada de valor real).
import type { RunSave } from '../../lib/game-save';

export interface Award {
  coins: number;
  xp: number;
  gems: number;
  tickets: number;
  badges: number;
  energy: number;
}

export function computeAward(save: RunSave, level: number, score: number, combo: number): Award {
  return {
    coins: 20 + level * 5 + Math.floor(score / 10),
    xp: 15 + level * 3 + Math.floor(score / 5),
    gems: level % 5 === 0 ? 2 : 0, // pedra a cada 5 níveis
    tickets: combo >= 8 ? 1 : 0, // bilhete por combo alto
    badges: score >= 500 ? 1 : 0,
    energy: 10,
  };
}

export function applyAward(save: RunSave, a: Award): RunSave {
  return {
    ...save,
    coins: (save.coins || 0) + a.coins,
    xp: (save.xp || 0) + a.xp,
    gems: (save.gems || 0) + a.gems,
    tickets: (save.tickets || 0) + a.tickets,
    badges: (save.badges || 0) + a.badges,
    energy: Math.min(100, (save.energy ?? 100) + a.energy),
  };
}

export function buyCosmetic(save: RunSave, cost: number, id: string): RunSave {
  const coins = save.coins || 0;
  if (coins < cost || (save.cosmetics || []).includes(id)) return save;
  return { ...save, coins: coins - cost, cosmetics: [...(save.cosmetics || []), id] };
}
