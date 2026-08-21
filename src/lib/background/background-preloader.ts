import { BackgroundCache } from "./background-cache";

// Pré-carrega URLs de fundo para que a troca seja imediata.
export class BackgroundPreloader {
  constructor(private readonly cache = new BackgroundCache()) {}

  preload(urls: string[]): void {
    for (const url of urls) {
      if (this.cache.has(url)) continue;
      const img = new Image();
      img.src = url;
      this.cache.store(url, img);
    }
  }

  ready(url: string): boolean {
    return this.cache.has(url);
  }
}
