import type { MemoryEntry } from "./types";

// Índice de memória: mantém referência a todos os sub-sistemas de memória
// para que o manager possa orquestrá-los num só ponto.
export interface MemoryStore {
  id: string;
  tier: MemoryEntry["tier"];
  enabled: boolean;
}

export class MemoryIndex {
  private stores = new Map<string, MemoryStore>();

  register(store: MemoryStore): void {
    this.stores.set(store.id, store);
  }

  enable(id: string, enabled: boolean): void {
    const store = this.stores.get(id);
    if (store) store.enabled = enabled;
  }

  list(): MemoryStore[] {
    return Array.from(this.stores.values());
  }
}
