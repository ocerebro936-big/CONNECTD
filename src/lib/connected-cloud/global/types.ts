// ============================================================================
// Global Node/Region Manager — tipos
// ----------------------------------------------------------------------------
// Um Node NUNCA é "online" só por estar cadastrado. O estado vem de
// heartbeat/health real (lastHeartbeat fresco + métricas reais do Node).
// ============================================================================
export type CloudRegion = "MZ" | "ZA" | "EU" | "US";
export type NodeStatus = "online" | "degraded" | "offline";

export interface CloudNode {
  id: string;
  region: CloudRegion;
  status: NodeStatus;
  capacityBytes: number;
  usedBytes: number;
  latencyMs: number;
  activeUploads: number;
  version: string;
  lastHeartbeat: number;
}

// Configuração do operador (cadastro). Estado em si é preenchido por sync/heartbeat.
export interface NodeDefinition {
  id: string;
  region: CloudRegion;
  baseUrl: string;
  /** nó interno do Object Node a consultar em /v1/nodes/health (vazio = sem Node real => offline) */
  healthKey?: string;
  capacityBytes: number;
  /** custo relativo por GB (menor = mais barato) */
  costPerGB: number;
  version: string;
}
