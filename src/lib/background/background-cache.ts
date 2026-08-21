import type { BackgroundAsset } from "./background-engine";

// Cache de fundos: mantém a lista carregada e as imagens pré-carregadas
// para troca instantânea sem frico.
export class BackgroundCache {
  private preloaded = new Map<string, HTMLImageElement>();

  get(url: string): HTMLImageElement | undefined {
    return this.preloaded.get(url);
  }

  has(url: string): boolean {
    return this.preloaded.has(url);
  }

  store(url: string, img: HTMLImageElement): void {
    this.preloaded.set(url, img);
  }
}
