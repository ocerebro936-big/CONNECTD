// ============================================================================
// Connected Cloud Gateway — cliente leve do Reactor (sem dependências).
// Fala com o Object Node real (Connected Cloud Server v2). Em produção o
// VITE_CCS_GATEWAY_URL aponta para o Gateway HTTPS à frente dos Cloud Nodes.
// ============================================================================
const GATEWAY =
  (import.meta.env.VITE_CCS_GATEWAY_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8787";

async function gw<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${GATEWAY}${path}`, init);
  let data: any = null;
  try { data = await res.json(); } catch { /* HEAD/empty */ }
  return { ok: res.ok, status: res.status, data: data as T };
}

export const cloudGateway = {
  base: GATEWAY,
  health: () => gw("/v1/nodes/health"),
  metrics: () => gw("/v1/metrics"),
  replicate: (key: string) => gw("/v1/replicate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) }),
  snapshot: () => gw("/v1/backup/snapshot", { method: "POST" }),
  listSnapshots: () => gw<{ snapshots: string[] }>("/v1/backup/snapshots"),
  deleteSnapshot: (ts: string) => gw(`/v1/backup/snapshots/${encodeURIComponent(ts)}`, { method: "DELETE" }),
  gc: () => gw<{ removed: number }>("/v1/admin/gc", { method: "POST" }),
  nodeHead: (node: string, key: string) =>
    fetch(`${GATEWAY}/v1/nodes/${encodeURIComponent(node)}/objects/${encodeURIComponent(key)}`, { method: "HEAD" }).then((r) => r.ok),
};

export function setGatewayBase(url: string) {
  const clean = url.replace(/\/+$/, "");
  (cloudGateway as any).base = clean;
}
