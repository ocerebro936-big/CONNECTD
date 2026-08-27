// ============================================================================
// Registo de comandos reais — cada um invoca o motor que realmente suporta.
// Nada de números simulados: só estado real dos motores.
// ============================================================================
import { commandBus } from "./bus";
import type { CommandResult } from "./types";
import { getCloudSupervision } from "../connected-reactor/supervision";
import { globalNodeManager } from "../connected-cloud/global/manager";
import { cloudWorkerEngine } from "../connected-reactor/engine/worker-engine";
import { digitalReactor } from "../connected-reactor/index";
import { cloudGateway } from "../connected-reactor/gateway";
import { getEdgeStatus, getCacheStatus, getDeliveryTrace } from "../connected-edge";
import { runCapability } from "../divino/plugins/registry";

let initialized = false;

export function initCommands() {
  if (initialized) return;
  initialized = true;

  commandBus.register({
    id: "cloud.status",
    action: "run_diagnostics",
    run: () => {
      const s = getCloudSupervision();
      return { ok: true, summary: s.text, data: s };
    },
  });

  commandBus.register({
    id: "nodes.status",
    action: "run_diagnostics",
    run: () => ({ ok: true, summary: "Estado dos Nodes.", data: globalNodeManager.snapshot() }),
  });

  commandBus.register({
    id: "workers.status",
    action: "run_diagnostics",
    run: () => ({ ok: true, summary: "Estado dos Workers.", data: cloudWorkerEngine.results() }),
  });

  commandBus.register({
    id: "edge.status",
    action: "run_diagnostics",
    run: () => ({ ok: true, summary: "Estado do Edge/CDN.", data: { edge: getEdgeStatus(), cache: getCacheStatus() } }),
  });

  commandBus.register({
    id: "divino.ask",
    action: "run_diagnostics",
    run: async (ctx): Promise<CommandResult> => {
      const cap = ctx.args?.capability || "cloud_status";
      const r = await runCapability(cap, { uid: ctx.uid, role: ctx.role as any, args: ctx.args });
      return { ok: !!r?.ok, summary: r?.summary || "Sem resposta.", data: r?.data };
    },
  });

  commandBus.register({
    id: "cloud.snapshot",
    action: "run_diagnostics",
    run: async (): Promise<CommandResult> => {
      const r = await cloudGateway.snapshot();
      return { ok: !!r?.ok, summary: r?.ok ? "Snapshot dos backups criado." : "Falha no snapshot.", data: r };
    },
  });

  commandBus.register({
    id: "cloud.replicate",
    action: "run_diagnostics",
    run: async (ctx): Promise<CommandResult> => {
      const key = ctx.args?.key;
      if (!key) return { ok: false, summary: "Chave necessária para replicar." };
      const r = await cloudGateway.replicate(key);
      return { ok: !!r?.ok, summary: r?.ok ? `Replicado ${key}.` : `Falha ao replicar ${key}.`, data: r };
    },
  });

  commandBus.register({
    id: "nodes.failover",
    action: "run_diagnostics",
    run: (): CommandResult => {
      const f = globalNodeManager.failover();
      return { ok: true, summary: f ? `Failover para ${f.id} (${f.region}).` : "Nenhum Node disponível para failover.", data: f };
    },
  });

  // destrutiva — exige confirmação obrigatória
  commandBus.register({
    id: "cloud.cleanup",
    action: "delete_own_file",
    destructive: true,
    run: async (): Promise<CommandResult> => {
      const r = await cloudGateway.gc();
      return { ok: !!r?.ok, summary: r?.ok ? "Limpeza concluída." : "Falha na limpeza.", data: r };
    },
  });
}
