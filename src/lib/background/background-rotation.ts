import type { BackgroundAsset } from "./background-engine";

// Rotação de fundos: cicla por intervalo (ou manualmente). Em memória;
// não depende de nenhum serviço externo para decidir a ordem.
export class BackgroundRotation {
  constructor(
    private readonly assets: () => BackgroundAsset[],
    private readonly advance: () => string | null,
    private readonly intervalMs = 30_000,
  ) {}

  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.timer || this.assets().length <= 1) return;
    this.timer = setInterval(() => this.advance(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
