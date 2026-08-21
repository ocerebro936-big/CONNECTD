// ============================================================================
// Cloud Supervision — agrega Reactor + 7 workers num relatório humano para o
// DIVINO (cérebro de supervisão, NÃO executor). Responde a "como está a Cloud?".
// ============================================================================
import { digitalReactor } from "./core/reactor";
import { cloudWorkerEngine } from "./engine/worker-engine";

export interface CloudSupervision {
  cloud: "HEALTHY" | "DEGRADED";
  nodesOnline: number;
  nodesTotal: number;
  storagePct: number;
  uploads: number;
  processing: number;
  replication: "OK" | "CHECK" | "REBUILD";
  backup: "OK" | "PENDING" | "CHECK";
  latencyMs: number;
  text: string;
}

export function getCloudSupervision(): CloudSupervision {
  const r = digitalReactor.summary();
  const health = cloudWorkerEngine.get("health");
  const repl = cloudWorkerEngine.get("replication");
  const backup = cloudWorkerEngine.get("backup");
  const media = cloudWorkerEngine.get("media");
  const upload = cloudWorkerEngine.get("upload");

  const nodesOnline = health?.metrics?.nodesOnline ?? 0;
  const nodesTotal = health?.metrics?.nodesTotal ?? 0;
  const storagePct = health?.metrics?.storagePct ?? 0;
  const latencyMs = health?.metrics?.latencyMs ?? 0;

  const replicationState: CloudSupervision["replication"] = !repl ? "CHECK" : repl.ok ? "OK" : "REBUILD";
  const backupState: CloudSupervision["backup"] = !backup ? "CHECK" : backup.ok ? (backup.metrics?.snapshot ? "OK" : "PENDING") : "CHECK";

  const cloud: CloudSupervision["cloud"] =
    r.healthy && replicationState !== "REBUILD" && backupState !== "CHECK" ? "HEALTHY" : "DEGRADED";

  const uploads = upload?.metrics?.completed ?? r.activeUploads;
  const processing = media?.metrics?.processed ?? 0;

  const text = [
    `Cloud: ${cloud}`,
    `Nodes: ${nodesOnline}/${nodesTotal} online`,
    `Storage: ${storagePct}%`,
    `Uploads: ${uploads}`,
    `Processing: ${processing}`,
    `Replication: ${replicationState}`,
    `Backup: ${backupState}`,
    `Latency: ${latencyMs}ms`,
  ].join("\n");

  return { cloud, nodesOnline, nodesTotal, storagePct, uploads, processing, replication: replicationState, backup: backupState, latencyMs, text };
}
