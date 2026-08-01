export type SoundName = 'message' | 'like' | 'notification' | 'post' | 'live' | 'payment' | 'game' | 'call' | 'error';

export interface SoundPrefs {
  enabled: boolean;
  volume: number;
}

const SOUND_PREFS_KEY = 'connected_sound_prefs';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function getSoundPrefs(): SoundPrefs {
  try {
    const raw = localStorage.getItem(SOUND_PREFS_KEY);
    if (!raw) return { enabled: true, volume: 0.7 };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== false,
      volume: typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : 0.7,
    };
  } catch {
    return { enabled: true, volume: 0.7 };
  }
}

export function setSoundPrefs(prefs: SoundPrefs) {
  localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(prefs));
}

interface ToneOpts {
  freq: number;
  time?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
}

function tone({ freq, time = 0, duration = 0.12, type = 'sine', gain = 0.5 }: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + time);
  const gv = getSoundPrefs().volume;
  g.gain.setValueAtTime(0.0001, c.currentTime + time);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain * gv), c.currentTime + time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + time + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime + time);
  osc.stop(c.currentTime + time + duration + 0.05);
}

const SOUNDS: Record<SoundName, () => void> = {
  message: () => {
    tone({ freq: 880, duration: 0.09, type: 'sine', gain: 0.4 });
    tone({ freq: 1320, time: 0.09, duration: 0.12, type: 'sine', gain: 0.35 });
  },
  like: () => {
    tone({ freq: 660, duration: 0.14, type: 'triangle', gain: 0.35 });
    tone({ freq: 990, time: 0.02, duration: 0.16, type: 'sine', gain: 0.2 });
  },
  notification: () => {
    tone({ freq: 660, duration: 0.1, type: 'sine', gain: 0.3 });
    tone({ freq: 990, time: 0.11, duration: 0.16, type: 'sine', gain: 0.3 });
  },
  post: () => {
    tone({ freq: 523.25, duration: 0.09, type: 'triangle', gain: 0.3 });
    tone({ freq: 659.25, time: 0.08, duration: 0.09, type: 'triangle', gain: 0.3 });
    tone({ freq: 783.99, time: 0.16, duration: 0.16, type: 'triangle', gain: 0.35 });
  },
  live: () => {
    tone({ freq: 220, duration: 0.12, type: 'square', gain: 0.15 });
    tone({ freq: 330, time: 0.1, duration: 0.12, type: 'square', gain: 0.15 });
    tone({ freq: 440, time: 0.2, duration: 0.18, type: 'square', gain: 0.18 });
  },
  payment: () => {
    tone({ freq: 523.25, duration: 0.1, type: 'sine', gain: 0.35 });
    tone({ freq: 659.25, time: 0.1, duration: 0.1, type: 'sine', gain: 0.35 });
    tone({ freq: 783.99, time: 0.2, duration: 0.2, type: 'sine', gain: 0.4 });
  },
  game: () => {
    tone({ freq: 392, duration: 0.08, type: 'triangle', gain: 0.3 });
    tone({ freq: 523.25, time: 0.09, duration: 0.08, type: 'triangle', gain: 0.3 });
    tone({ freq: 659.25, time: 0.18, duration: 0.14, type: 'triangle', gain: 0.35 });
  },
  call: () => {
    tone({ freq: 587.33, duration: 0.18, type: 'sine', gain: 0.3 });
    tone({ freq: 587.33, time: 0.25, duration: 0.18, type: 'sine', gain: 0.3 });
    tone({ freq: 587.33, time: 0.5, duration: 0.18, type: 'sine', gain: 0.3 });
  },
  error: () => {
    tone({ freq: 220, duration: 0.12, type: 'sawtooth', gain: 0.15 });
    tone({ freq: 180, time: 0.12, duration: 0.18, type: 'sawtooth', gain: 0.15 });
  },
};

export function playSound(name: SoundName) {
  const prefs = getSoundPrefs();
  if (!prefs.enabled || prefs.volume <= 0) return;
  try {
    SOUNDS[name]?.();
  } catch (e) {
    console.warn('Erro ao reproduzir som:', e);
  }
}

export function previewSound(name: SoundName) {
  playSound(name);
}
