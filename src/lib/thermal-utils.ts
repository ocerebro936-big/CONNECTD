export type TemperatureLevel = 'cold' | 'warm' | 'hot' | 'fire';

export interface TemperatureStyle {
  level: TemperatureLevel;
  label: string;
  emoji: string;
  border: string;
  glow: string;
  badge: string;
  color: string;
  scale: number;
}

export function calculateTemperature(likes = 0, comments = 0, views = 0): number {
  const ratingScore = (likes * 2.0) + (comments * 3.0) + (views * 0.5);
  return Math.round(Math.min(ratingScore, 999));
}

export function getTemperatureStyles(temp: number): TemperatureStyle {
  if (temp >= 100) {
    return {
      level: 'fire',
      label: 'EM FOGO',
      emoji: '🔥',
      border: 'border-red-500',
      glow: 'shadow-[0_0_25px_rgba(239,68,68,0.7)]',
      badge: 'bg-red-600 text-white animate-pulse',
      color: 'text-red-500',
      scale: 1.04,
    };
  }
  if (temp >= 50) {
    return {
      level: 'hot',
      label: 'QUENTE',
      emoji: '🟠',
      border: 'border-orange-500',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]',
      badge: 'bg-orange-500 text-white',
      color: 'text-orange-500',
      scale: 1.02,
    };
  }
  if (temp >= 20) {
    return {
      level: 'warm',
      label: 'MORNO',
      emoji: '🟢',
      border: 'border-emerald-500',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.35)]',
      badge: 'bg-emerald-500 text-white',
      color: 'text-emerald-500',
      scale: 1.0,
    };
  }
  return {
    level: 'cold',
    label: 'FRIO',
    emoji: '🔵',
    border: 'border-blue-500/40',
    glow: 'shadow-none',
    badge: 'bg-blue-600/80 text-white',
    color: 'text-blue-400',
    scale: 0.96,
  };
}

export function getGridCols(temp: number): string {
  if (temp >= 100) return 'col-span-12 md:col-span-8 lg:col-span-9';
  if (temp >= 50) return 'col-span-12 md:col-span-6 lg:col-span-6';
  if (temp >= 20) return 'col-span-12 md:col-span-4 lg:col-span-4';
  return 'col-span-12 md:col-span-3 lg:col-span-3';
}
