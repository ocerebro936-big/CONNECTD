import type { NodeManager } from "./manager";
import type { CloudFleetHealth } from "./manager";
import { connectedRuntime } from "../../connected-runtime";

export interface CloudGuardianAlert {
  level: "info" | "warn" | "critical";
  code: string;
  message: string;
  nodeId?: string;
}

export interface CloudGuardianReport {
  timestamp: number;
  fleet: CloudFleetHealth;
  runtime: { ready: number; degraded: number; offline: number };
  alerts: CloudGuardianAlert[];
}

// ============================================================================
// Cloud Guardian — monitorização operacional da Connected Cloud.
// ----------------------------------------------------------------------------
// Acompanha heartbeat, saúde de storage, falhas de upload, erros de checksum,
// latência e capacidade. GERA alertas reais. O DIVINO pode CONSULTAR o
// Guardian, mas NUNCA tem autoridade para apagar, mover ou modificar objetos.
// ============================================================================
export class CloudGuardian {
  constructor(private readonly manager: NodeManager) {}

  report(): CloudGuardianReport {
    const fleet = this.manager.fleetHealth();
    const services = connectedRuntime.registry.list();
    const runtime = {
      ready: services.filter((s) => s.status === "ready").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      offline: services.filter((s) => s.status === "offline").length,
    };
    const alerts: CloudGuardianAlert[] = [];

    for (const n of fleet.nodes) {
      if (n.status === "offline") {
        alerts.push({
          level: "critical",
          code: "NODE_OFFLINE",
          message: `Node ${n.id} (${n.region}) está offline.`,
          nodeId: n.id,
        });
      } else if (n.status === "degraded") {
        alerts.push({
          level: "warn",
          code: "NODE_DEGRADED",
          message: `Node ${n.id} com utilização elevada (${Math.round(
            (n.capacityBytes
              ? (n.capacityBytes - n.availableBytes) / n.capacityBytes
              : 0) * 100,
          )}%).`,
          nodeId: n.id,
        });
      }
    }

    if (runtime.offline > 0) {
      alerts.push({
        level: "critical",
        code: "RUNTIME_OFFLINE",
        message: `${runtime.offline} serviço(s) do Connected Runtime offline.`,
      });
    }

    if (fleet.checksumErrors > 0) {
      alerts.push({
        level: "warn",
        code: "CHECKSUM_ERRORS",
        message: `${fleet.checksumErrors} erro(s) de checksum detetado(s).`,
      });
    }

    if (fleet.errors > 0) {
      alerts.push({
        level: "info",
        code: "UPLOAD_FAILURES",
        message: `${fleet.errors} falha(s) de operação acumulada(s).`,
      });
    }

    return {
      timestamp: Date.now(),
      fleet,
      runtime,
      alerts,
    };
  }

  // Painel do CEO: só dados reais provenientes dos serviços.
  dashboard() {
    const r = this.report();
    const f = r.fleet;
    const metrics = this.manager
      .list()
      .map((n) => n.getMetrics());
    const uploads = metrics.reduce((s, m) => s + m.uploads, 0);
    const downloads = metrics.reduce((s, m) => s + m.downloads, 0);
    return {
      nodes: f.nodes.length,
      online: f.online,
      degraded: f.degraded,
      offline: f.offline,
      storageTotalTb: Number(
        (f.totalCapacity / 1024 ** 4).toFixed(2),
      ),
      storageUsedTb: Number((f.totalUsed / 1024 ** 4).toFixed(2)),
      storageAvailableTb: Number(
        (f.available / 1024 ** 4).toFixed(2),
      ),
      uploads,
      downloads,
      errors: f.errors,
      avgLatencyMs: f.avgLatencyMs,
      runtime: r.runtime,
      alerts: r.alerts,
    };
  }
}
