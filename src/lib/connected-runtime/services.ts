// ============================================================================
// Connected Runtime — camada única de serviços reais.
// ----------------------------------------------------------------------------
// Cada serviço regista o seu estado. Se um serviço estiver indisponível, a
// aplicação NÃO finge que está a funcionar: o runtime reporta o estado real.
// Nada aqui gera dados falsos; apenas reflete a disponibilidade real.
// ============================================================================

export type ServiceStatus =
  | "ready"
  | "degraded"
  | "offline";

export interface RuntimeService {
  id: string;
  label: string;
  status: ServiceStatus;
  detail?: string;
  updatedAt: string;
}

export type ServiceListener = (
  services: RuntimeService[],
) => void;
