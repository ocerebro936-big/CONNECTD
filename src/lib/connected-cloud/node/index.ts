import { createNode, NodeManager } from "./manager";
import { CloudGuardian } from "./guardian";

// Node primário da Connected King (store próprio; em produção aponta para o
// storage/provider real do servidor físico do node).
export const connectedNode = createNode(
  "ck-node-mz",
  "mz",
  1024 * 1024 * 1024 * 1024, // 1 TB (referência de capacidade)
);

// Node de réplica (mesma região global) — preparado para redundância real.
export const replicaNode = createNode(
  "ck-node-global",
  "global",
  1024 * 1024 * 1024 * 1024,
);

export const nodeManager = new NodeManager();
nodeManager.register(connectedNode);
nodeManager.register(replicaNode);

export const cloudGuardian = new CloudGuardian(nodeManager);

export function getCloudDashboard() {
  return cloudGuardian.dashboard();
}

// Heartbeat periódico do fleet (arranca com o módulo).
if (typeof window !== "undefined") {
  nodeManager.start(15000);
}

export * from "./cloud-node";
export * from "./manager";
export * from "./guardian";
