// Connected RUN: KINGDOM — regiões do Connected World.
export interface RegionDef {
  id: string;
  name: string;
  emoji: string;
  sky: string;
  ground: string;
  obstacle: string;
  accent: string;
  climate: string;
  collectible: string;
  music: string;
  unlockRuns?: number; // corridas globais para desbloquear (0 = disponível)
}

export const REGIONS: RegionDef[] = [
  { id: 'city', name: 'Connected City', emoji: '🌆', sky: '#0b1020', ground: '#1b2540', obstacle: '#ff5d5d', accent: '#4fd1ff', climate: 'Urbano', collectible: '💡', music: 'Synthwave City' },
  { id: 'coast', name: 'African Coast', emoji: '🌴', sky: '#0e2a3a', ground: '#13506b', obstacle: '#ff8c42', accent: '#ffd166', climate: 'Tropical', collectible: '🐚', music: 'Marrabenta Beat' },
  { id: 'desert', name: 'Desert Kingdom', emoji: '🏜️', sky: '#3a2a12', ground: '#6b4f1f', obstacle: '#e0a458', accent: '#ffcf6b', climate: 'Árido', collectible: '🏺', music: 'Desert Drums' },
  { id: 'valley', name: 'Green Valley', emoji: '🌳', sky: '#0f2a18', ground: '#1f5b33', obstacle: '#7bd88f', accent: '#bdf2c4', climate: 'Verde', collectible: '🌿', music: 'Acoustic Roots' },
  { id: 'neon', name: 'Neon Future', emoji: '🌌', sky: '#1a0b3a', ground: '#2c1b66', obstacle: '#b14dff', accent: '#ff5dd2', climate: 'Futurista', collectible: '🔮', music: 'Hyper Neon' },
  { id: 'cloud', name: 'Cloud Kingdom', emoji: '☁️', sky: '#102a3a', ground: '#3f6fb0', obstacle: '#9fd0ff', accent: '#e8f6ff', climate: 'Etéreo', collectible: '☁️', music: 'Ambient Sky' },
  { id: 'king', name: 'King District', emoji: '👑', sky: '#2a1500', ground: '#7a4d12', obstacle: '#ffd700', accent: '#ffe98a', climate: 'Real', collectible: '👑', music: 'Royal Anthem' },
  { id: 'future', name: 'Future World', emoji: '🚀', sky: '#04121f', ground: '#0a334d', obstacle: '#37e0c8', accent: '#8af7ff', climate: 'Espacial', collectible: '🛸', music: 'Orbit Pulse' },
];

export function getRegion(id: string): RegionDef {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}
