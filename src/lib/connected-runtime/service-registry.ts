import type {
  RuntimeService,
  ServiceListener,
  ServiceStatus,
} from "./services";

// Registo central de serviços da Connected King.
export class ServiceRegistry {
  private services = new Map<string, RuntimeService>();
  private listeners = new Set<ServiceListener>();

  register(
    id: string,
    label: string,
    status: ServiceStatus = "ready",
  ): void {
    this.services.set(id, {
      id,
      label,
      status,
      updatedAt: new Date().toISOString(),
    });
    this.emit();
  }

  setStatus(
    id: string,
    status: ServiceStatus,
    detail?: string,
  ): void {
    const existing = this.services.get(id);

    if (!existing) {
      return;
    }

    this.services.set(id, {
      ...existing,
      status,
      detail,
      updatedAt: new Date().toISOString(),
    });

    this.emit();
  }

  get(id: string): RuntimeService | null {
    return this.services.get(id) ?? null;
  }

  list(): RuntimeService[] {
    return Array.from(this.services.values());
  }

  subscribe(listener: ServiceListener): () => void {
    this.listeners.add(listener);
    listener(this.list());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
