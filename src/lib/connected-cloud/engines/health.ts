import {
  runHealthChecks,
  type HealthCheck,
  type HealthStatus,
} from "../health/health";

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  services: Array<{
    name: string;
    status: HealthStatus;
    latencyMs?: number;
    details?: Record<string, unknown>;
  }>;
}

export interface HealthEngine {
  register(check: HealthCheck): void;
  run(): Promise<HealthReport>;
}

export class ConnectedHealthEngine
  implements HealthEngine {

  private checks: HealthCheck[] = [];

  register(check: HealthCheck) {
    this.checks.push(check);
  }

  async run() {
    const report =
      await runHealthChecks(this.checks);
    return report as HealthReport;
  }
}
