// ============================================================================
// DIVINO IA — Plugin Registry (Tool Bus)
// ----------------------------------------------------------------------------
// Cada capacidade mapeia para uma ferramenta real. O Divino escolhe o
// especialista apenas quando necessário e executa através deste barramento.
// ============================================================================
import type { DivinoToolResult } from '../types';
import { inspectOwnStorage, ccsDiagnostics } from '../tools/cloud';
import { searchUsers, searchPosts } from '../tools/social';
import { listChannels } from '../tools/tv';
import { retrieveRanking, inspectScore } from '../tools/games';
import { serviceHealth } from '../tools/admin';
import { connectedDiagnose, connectedOrchestrate } from '../tools/connected';
import { economyStatus } from '../tools/economy';
import { cloudStatus } from '../tools/cloud-status';
import { reactorStatus } from '../tools/reactor';
import { cloudDelete } from '../tools/cloud-delete';
import { cloudTrace } from '../tools/cloud-trace';
import { globalCloudStatus } from '../tools/global-cloud-status';
import { nodeStatus } from '../tools/node-status';
import { bestNode } from '../tools/best-node';
import { edgeStatus } from '../tools/edge-status';
import { cacheStatus } from '../tools/cache-status';
import { deliveryTrace } from '../tools/delivery-trace';
import { memoryPlugin } from './memory/memory-plugin';
import { recallPlugin } from './memory/recall-plugin';
import { contextPlugin } from './memory/context-plugin';
import { summarizePlugin } from './memory/summarize-plugin';
import { preferencePlugin } from './memory/preference-plugin';

export interface ToolContext {
  uid: string;
  role: string;
  term?: string;
  args?: Record<string, any>;
}

type ToolFn = (ctx: ToolContext) => Promise<{ ok: boolean; summary: string; data?: any }>;

export const PLUGIN_BUS: Record<string, { plugin: string; fn: ToolFn }> = {
  inspect_upload: { plugin: 'cloud_diagnostics', fn: (c) => inspectOwnStorage(c.uid) },
  inspect_storage: { plugin: 'cloud_diagnostics', fn: (c) => inspectOwnStorage(c.uid) },
  inspect_quota: { plugin: 'cloud_diagnostics', fn: (c) => inspectOwnStorage(c.uid) },
  ccs_diagnostics: { plugin: 'cloud_diagnostics', fn: () => ccsDiagnostics() },
  search_users: { plugin: 'connected_support', fn: (c) => searchUsers(c.term || '') },
  search_posts: { plugin: 'connected_support', fn: (c) => searchPosts(c.term || '') },
  list_channels: { plugin: 'connected_tv', fn: () => listChannels() },
  retrieve_ranking: { plugin: 'game_assistant', fn: () => retrieveRanking() },
  inspect_score: { plugin: 'game_assistant', fn: (c) => inspectScore(c.uid) },
  service_health: { plugin: 'connected_admin', fn: () => serviceHealth() },
  connected_health: { plugin: 'connected_orchestrator', fn: (c) => connectedDiagnose(c.uid) },
  connected_orchestrate: { plugin: 'connected_orchestrator', fn: (c) => connectedOrchestrate(c.uid, c.role) },
  economy_status: { plugin: 'connected_economy', fn: (c) => economyStatus(c.uid) },
  cloud_status: { plugin: 'connected_cloud', fn: () => cloudStatus() },
  reactor_status: { plugin: 'connected_reactor', fn: () => reactorStatus() },
  cloud_delete: { plugin: 'connected_cloud', fn: (c) => cloudDelete(c as any) },
  cloud_trace: { plugin: 'connected_cloud', fn: () => cloudTrace() },
  global_cloud_status: { plugin: 'connected_cloud', fn: () => globalCloudStatus() },
  node_status: { plugin: 'connected_cloud', fn: (c) => nodeStatus(c as any) },
  best_node: { plugin: 'connected_cloud', fn: (c) => bestNode(c as any) },
  edge_status: { plugin: 'connected_edge', fn: () => edgeStatus() },
  cache_status: { plugin: 'connected_edge', fn: () => cacheStatus() },
  delivery_trace: { plugin: 'connected_edge', fn: () => deliveryTrace() },
  memory_status: { plugin: 'divino_memory', fn: () => memoryPlugin({ uid: '', role: 'user' }) },
  memory_recall: { plugin: 'divino_memory', fn: (c) => recallPlugin(c) },
  memory_context: { plugin: 'divino_memory', fn: (c) => contextPlugin(c) },
  memory_summarize: { plugin: 'divino_memory', fn: (c) => summarizePlugin(c) },
  memory_preference: { plugin: 'divino_memory', fn: (c) => preferencePlugin(c) },
};

export async function runCapability(capability: string, ctx: ToolContext): Promise<DivinoToolResult | null> {
  const entry = PLUGIN_BUS[capability];
  if (!entry) return null;
  try {
    const r = await entry.fn(ctx);
    return { plugin: entry.plugin, capability, ok: r.ok, summary: r.summary, data: r.data };
  } catch (e: any) {
    return { plugin: entry.plugin, capability, ok: false, summary: 'Erro ao executar ferramenta.', data: String(e?.message || e) };
  }
}
