import type { MemoryEntry } from "./types";

// Memória de trabalho: o conjunto ativo de contexto usado no raciocínio
// atual (não persiste). Reduz o trabalho do cérebro mantendo só o relevante.
export class WorkingMemory {
  private active: MemoryEntry[] = [];

  set(entries: MemoryEntry[]): void {
    this.active = entries;
  }

  add(entry: MemoryEntry): void {
    this.active.push(entry);
  }

  get(): MemoryEntry[] {
    return this.active;
  }

  clear(): void {
    this.active = [];
  }
}
