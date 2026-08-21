import type {
  RuntimeService,
  ServiceStatus,
} from "./services";

export interface RuntimeHealth {
  status: ServiceStatus;
  timestamp: string;
  services: RuntimeService[];
}

// Agrega o estado de todos os serviços numa saúde global.
export function aggregateHealth(
  services: RuntimeService[],
): RuntimeHealth {
  const status: ServiceStatus = services.some(
    (s) => s.status === "offline",
  )
    ? "offline"
    : services.some((s) => s.status === "degraded")
      ? "degraded"
      : "ready";

  return {
    status,
    timestamp: new Date().toISOString(),
    services,
  };
}
