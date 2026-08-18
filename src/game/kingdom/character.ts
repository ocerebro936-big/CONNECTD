// Connected RUN: KINGDOM — personagem King e cosméticos.
export type KingVersion = 'runner' | 'hero' | 'legend';

export interface Cosmetic {
  id: string;
  name: string;
  type: 'crown' | 'shoes' | 'backpack' | 'glasses' | 'trail' | 'skin';
  cost: number; // coins
  emoji?: string;
}

export const KING_VERSIONS: { id: KingVersion; name: string; minLevel: number; emoji: string }[] = [
  { id: 'runner', name: 'Runner', minLevel: 1, emoji: '🏃' },
  { id: 'hero', name: 'King Hero', minLevel: 10, emoji: '🤴' },
  { id: 'legend', name: 'King Legend', minLevel: 25, emoji: '👑' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'crown_gold', name: 'Coroa de Ouro', type: 'crown', cost: 500, emoji: '👑' },
  { id: 'crown_gem', name: 'Coroa de Gema', type: 'crown', cost: 1200, emoji: '💎' },
  { id: 'shoes_flash', name: 'Ténis Relâmpago', type: 'shoes', cost: 300, emoji: '⚡' },
  { id: 'backpack_king', name: 'Mochila Real', type: 'backpack', cost: 400, emoji: '🎒' },
  { id: 'glasses_royal', name: 'Óculos Reais', type: 'glasses', cost: 250, emoji: '🕶️' },
  { id: 'trail_fire', name: 'Rasto de Fogo', type: 'trail', cost: 600, emoji: '🔥' },
  { id: 'skin_neon', name: 'Pele Neon', type: 'skin', cost: 800, emoji: '🌈' },
];

export function kingVersionForLevel(level: number): KingVersion {
  if (level >= 25) return 'legend';
  if (level >= 10) return 'hero';
  return 'runner';
}
