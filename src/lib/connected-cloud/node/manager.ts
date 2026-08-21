import { CloudNode } from "./cloud-node";
import type { ConnectedCloudNode } from "./cloud-node";
import { createMemoryEngines } from "../engines";
import { MemoryObjectStore } from "../storage/object-store";
import { ConnectedCloud } from "../core/cloud";

// Cria um node independente (store próprio) — base para redundância real.
export function createNode(
  id: string,
  region: string,
  capacityBytes: number,
): CloudNode {
  const store = new MemoryObjectStore();
  const cloud = new ConnectedCloud(createMemoryEngines({ store }));
  return new CloudNode(cloud, { id, region, capacityBytes });
}

export interface CloudFleetHealth {
  online: number;
  degraded: number;
  offline: number;
  totalCapacity: number;
  totalUsed: number;
  available: number;
  avgLatencyMs: number;
  errors: number;
  checksumErrors: number;
  nodes: ConnectedCloudNode[];
}

// ============================================================================
// Node Manager — gere o fleet da Connected Cloud.
// ----------------------------------------------------------------------------
// Responsabilidades reais: heartbeat periódico, descoberta de saúde,
// seleção do node primário (menor utilização), failover para outro node
// online e replicação de bytes entre nodes. Não simula servidores físicos.
// ============================================================================
export class NodeManager {
  private nodes: CloudNode[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  register(node: CloudNode): void {
    this.nodes.push(node);
  }

  unregister(id: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== id);
  }

  list(): CloudNode[] {
    return this.nodes.slice();
  }

  heartbeatAll(): void {
    for (const n of this.nodes) {
      if (n.status !== "offline") n.heartbeat();
    }
  }

  start(intervalMs = 15000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.heartbeatAll(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  online(): CloudNode[] {
    return this.nodes.filter((n) => n.status !== "offline");
  }

  // Node primário = online com menor utilização.
  primary(): CloudNode | null {
    const on = this.online();
    if (!on.length) return null;
    return on.slice().sort((a, b) => a.utilization - b.utilization)[0];
  }

  // Failover: outro node online (diferente do em falha) para servir o objeto.
  failover(fromId: string): CloudNode | null {
    const candidates = this.online().filter((n) => n.id !== fromId);
    if (!candidates.length) return null;
    return candidates.sort(
      (a, b) => a.utilization - b.utilization,
    )[0];
  }

  // Replicação real: copia os bytes de um objeto de um node para outro.
  async replicate(
    key: string,
    from: CloudNode,
    to: CloudNode,
  ): Promise<boolean> {
    const data = await from.raw(key);
    if (!data) return false;
    const head = await from.head(key);
    await to.store({
      ownerId: "system",
      key,
      data,
      mimeType: head?.contentType ?? "application/octet-stream",
    });
    return true;
  }

  fleetHealth(): CloudFleetHealth {
    const metrics = this.nodes.map((n) => n.getMetrics());
    const m = this.nodes.map((n) => n.getNodeInfo());
    const online = this.online();
    return {
      online: online.length,
      degraded: this.nodes.filter((n) => n.status === "degraded").length,
      offline: this.nodes.filter((n) => n.status === "offline").length,
      totalCapacity: this.nodes.reduce(
        (s, n) => s + n.capacityBytes,
        0,
      ),
      totalUsed: this.nodes.reduce((s, n) => s + n.usedBytes, 0),
      available: this.nodes.reduce(
        (s, n) => s + n.availableBytes,
        0,
      ),
      avgLatencyMs: metrics.length
        ? Math.round(
            metrics.reduce((s, x) => s + x.avgLatencyMs, 0) /
              metrics.length,
          )
        : 0,
      errors: metrics.reduce((s, x) => s + x.errors, 0),
      checksumErrors: metrics.reduce(
        (s, x) => s + x.checksumErrors,
        0,
      ),
      nodes: m,
    };
  }
}
