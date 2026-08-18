// Connected RUN: KINGDOM — Connected Moment + Connected Mode.
// Deteta uma sequência perfeita de ações e ativa o modo especial.
export type RunAction = 'jump' | 'slide' | 'collect' | 'dodge';

const PERFECT_SEQUENCE: RunAction[] = ['jump', 'slide', 'collect', 'dodge', 'jump'];

export class ConnectedMoments {
  private recent: RunAction[] = [];
  modeUntil = 0;
  combo = 0;

  log(action: RunAction, now: number): { connectedMoment: boolean; modeActive: boolean } {
    this.recent.push(action);
    if (this.recent.length > PERFECT_SEQUENCE.length) this.recent.shift();
    this.combo += 1;
    const connectedMoment = this.matches(this.recent, PERFECT_SEQUENCE);
    let modeActive = now < this.modeUntil;
    if (connectedMoment) {
      this.modeUntil = now + 6000; // 6s de Connected Mode
      modeActive = true;
      this.combo = 0;
      this.recent = [];
    }
    return { connectedMoment, modeActive };
  }

  isModeActive(now: number): boolean {
    return now < this.modeUntil;
  }

  private matches(seq: RunAction[], pattern: RunAction[]): boolean {
    if (seq.length < pattern.length) return false;
    return pattern.every((p, i) => seq[seq.length - pattern.length + i] === p);
  }
}
