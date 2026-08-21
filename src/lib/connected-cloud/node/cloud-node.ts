import { ConnectedCloud } from "../core/cloud";
import type { CloudUploadInput } from "../core/cloud";
import { calculateChecksum } from "../storage/checksum";
import {
  runHealthChecks,
  type HealthCheck,
  type HealthStatus,
} from "../health/health";

export type NodeStatus = "ready" | "degraded" | "offline";

export interface ConnectedCloudNode {
  id: string;
  region: string;
  status: NodeStatus;
  capacityBytes: number;
  usedBytes: number;
  availableBytes: number;
  latencyMs?: number;
  version: string;
  lastHeartbeat: number;
}

export interface NodeMetrics {
  uploads: number;
  downloads: number;
  errors: number;
  checksumErrors: number;
  avgLatencyMs: number;
}

const NODE_VERSION = "1.0.0";

// ============================================================================
// Connected Cloud Node — unidade de infraestrutura com identidade própria.
// ----------------------------------------------------------------------------
// Política de storage real: checksum → dedup → metadata → node → storage →
// verification → ready. Métricas são REAIS (incrementam em operações reais).
// Enquanto não há servidores físicos, o node é uma abstração preparada para
// os receber — não finge redundância física.
// ============================================================================
export class CloudNode {
  readonly id: string;
  readonly region: string;
  readonly capacityBytes: number;
  readonly version = NODE_VERSION;

  status: NodeStatus = "ready";
  usedBytes = 0;
  latencyMs?: number;
  lastHeartbeat = 0;

  private uploads = 0;
  private downloads = 0;
  private errors = 0;
  private checksumErrors = 0;
  private latencySum = 0;
  private latencyCount = 0;

  constructor(
    private readonly cloud: ConnectedCloud,
    spec: { id: string; region: string; capacityBytes: number },
  ) {
    this.id = spec.id;
    this.region = spec.region;
    this.capacityBytes = spec.capacityBytes;
  }

  get availableBytes(): number {
    return Math.max(0, this.capacityBytes - this.usedBytes);
  }

  get utilization(): number {
    return this.capacityBytes > 0
      ? this.usedBytes / this.capacityBytes
      : 0;
  }

  getMetrics(): NodeMetrics {
    return {
      uploads: this.uploads,
      downloads: this.downloads,
      errors: this.errors,
      checksumErrors: this.checksumErrors,
      avgLatencyMs:
        this.latencyCount > 0
          ? Math.round(this.latencySum / this.latencyCount)
          : 0,
    };
  }

  getNodeInfo(): ConnectedCloudNode {
    return {
      id: this.id,
      region: this.region,
      status: this.status,
      capacityBytes: this.capacityBytes,
      usedBytes: this.usedBytes,
      availableBytes: this.availableBytes,
      latencyMs: this.latencyMs,
      version: this.version,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  // Política de storage: o connectedCloud já faz checksum/dedup/metadata;
  // o node regista latência, carga e erros reais.
  async store(input: CloudUploadInput) {
    if (this.status === "offline") {
      this.errors++;
      throw new Error(`Node ${this.id} está offline.`);
    }
    const start = performance.now();
    try {
      const asset = await this.cloud.upload(input);
      this.usedBytes += asset.size;
      this.uploads++;
      this.recordLatency(start);
      return asset;
    } catch (e) {
      this.errors++;
      throw e;
    }
  }

  async retrieve(key: string, actorId: string, ownerId: string) {
    const start = performance.now();
    try {
      const data = await this.cloud.download(key, actorId, ownerId);
      this.downloads++;
      this.recordLatency(start);
      return data;
    } catch (e) {
      this.errors++;
      throw e;
    }
  }

  // Verificação pós-escrita: relê o objeto e confirma checksum.
  async verify(key: string): Promise<boolean> {
    const head = await this.cloud.head(key);
    if (!head?.checksum) return false;
    const data = await this.cloud.download(key, "system", "system");
    if (!data) {
      this.checksumErrors++;
      return false;
    }
    const actual = await calculateChecksum(data);
    if (actual !== head.checksum) {
      this.checksumErrors++;
      return false;
    }
    return true;
  }

  head(key: string) {
    return this.cloud.head(key);
  }

  raw(key: string) {
    return this.cloud.download(key, "system", "system");
  }

  heartbeat(): void {
    this.lastHeartbeat = Date.now();
    if (this.status !== "offline") {
      this.status =
        this.utilization > 0.9 ? "degraded" : "ready";
    }
  }

  setOnline(): void {
    this.status = "ready";
    this.heartbeat();
  }

  private recordLatency(start: number): void {
    const ms = performance.now() - start;
    this.latencyMs = Math.round(ms);
    this.latencySum += ms;
    this.latencyCount++;
  }

  health() {
    const toHealth = (
      s: NodeStatus,
    ): HealthStatus =>
      s === "ready"
        ? "healthy"
        : s === "degraded"
          ? "degraded"
          : "unhealthy";
    const checks: HealthCheck[] = [
      {
        name: `node:${this.id}`,
        check: async () => ({
          status: toHealth(this.status),
          latencyMs: this.latencyMs,
          details: {
            region: this.region,
            usedBytes: this.usedBytes,
            availableBytes: this.availableBytes,
            utilization: Number(this.utilization.toFixed(3)),
            metrics: this.getMetrics(),
          },
        }),
      },
    ];
    return runHealthChecks(checks);
  }

  setOffline(): void {
    this.status = "offline";
  }
}
