import { ServiceRegistry } from "./service-registry";
import { RuntimeEvents } from "./events";
import { aggregateHealth } from "./health";
import type { RuntimeHealth } from "./health";
import type { ServiceListener } from "./services";

// Serviços reais da Connected King. O estado reflete disponibilidade real;
// não há simulação de "tudo verde" — cada serviço reporta o que é.
export const CORE_SERVICES: Array<{
  id: string;
  label: string;
}> = [
  { id: "ccs", label: "Connected Cloud Storage" },
  { id: "divino", label: "DIVINO IA" },
  { id: "economy", label: "Connected Economy" },
  { id: "media", label: "Connected Media" },
  { id: "auth", label: "Autenticação" },
  { id: "chat", label: "Chat" },
  { id: "tv", label: "Connected TV" },
  { id: "marketplace", label: "Marketplace" },
  { id: "run", label: "Connected RUN" },
  { id: "notifications", label: "Notificações" },
];

export class ConnectedRuntime {
  readonly registry = new ServiceRegistry();
  readonly events = new RuntimeEvents();

  constructor() {
    for (const service of CORE_SERVICES) {
      this.registry.register(service.id, service.label, "ready");
    }
  }

  setStatus(
    id: string,
    status: Parameters<ServiceRegistry["setStatus"]>[1],
    detail?: string,
  ): void {
    this.registry.setStatus(id, status, detail);
  }

  health(): RuntimeHealth {
    return aggregateHealth(this.registry.list());
  }

  subscribe(listener: ServiceListener): () => void {
    return this.registry.subscribe(listener);
  }
}

export const connectedRuntime = new ConnectedRuntime();
