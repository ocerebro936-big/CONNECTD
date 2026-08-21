// Backup Worker — snapshots automáticos com retenção. Cria um snapshot de
// todos os objetos e mantém apenas os N mais recentes (recuperação/retention).
import { cloudGateway } from "../gateway";
import type { CloudWorker, WorkerResult, WorkerContext } from "./types";

const RETENTION = 5;

export const backupCloudWorker: CloudWorker = {
  id: "backup",
  intervalMs: 30000,
  async run(_ctx: WorkerContext): Promise<WorkerResult> {
    try {
      const snap = await cloudGateway.snapshot();
      const list = await cloudGateway.listSnapshots();
      const all = (list.data?.snapshots || []).sort();
      const old = all.slice(0, Math.max(0, all.length - RETENTION));
      for (const ts of old) await cloudGateway.deleteSnapshot(ts);
      return {
        ok: true,
        summary: `Backup: snapshot ${snap.data?.snapshot} (${snap.data?.objects} objetos), retenção ${RETENTION}.`,
        metrics: { snapshot: snap.data?.snapshot, objects: snap.data?.objects, retained: all.length - old.length },
      };
    } catch (e: any) {
      return { ok: false, summary: `Backup: falhou (${e?.message || e}).`, metrics: {} };
    }
  },
};
