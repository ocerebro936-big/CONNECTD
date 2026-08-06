export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface PhaseMeta {
  label: string;
  emoji: string;
  themeColor: string;
}

export const PHASES: Record<DayPhase, PhaseMeta> = {
  dawn: { label: 'Nascer do Sol', emoji: '🌅', themeColor: '#40281a' },
  day: { label: 'Dia', emoji: '☀️', themeColor: '#151208' },
  dusk: { label: 'Pôr do Sol', emoji: '🌇', themeColor: '#2b1a22' },
  night: { label: 'Noite', emoji: '🌙', themeColor: '#0b0912' },
};

export function getDayPhase(date: Date = new Date()): DayPhase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17.5) return 'day';
  if (h >= 17.5 && h < 20.5) return 'dusk';
  return 'night';
}

export function getPhaseLabel(phase: DayPhase): string {
  return PHASES[phase].label;
}

export function getPhaseThemeColor(phase: DayPhase): string {
  return PHASES[phase].themeColor;
}

export function applyPhaseToDocument(phase: DayPhase) {
  try {
    document.documentElement.dataset.phase = phase;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', PHASES[phase].themeColor);
  } catch {
    /* ignore */
  }
}
