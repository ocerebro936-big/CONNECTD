// ============================================================================
// Connected Cloud Status — painel de saúde dos motores autónomos
// ============================================================================
import React, { useEffect, useState } from 'react';
import { Cloud, Activity, CheckCircle2, XCircle, RefreshCw, Globe } from 'lucide-react';
import { engineRegistry, getEnginesHealth, EngineHealth } from '../lib/connected-engine';
import { Button } from '../components/ui/button';
import { globalNodeManager, type GlobalSnapshot } from '../lib/connected-cloud/global/manager';

const DASH = (s: GlobalSnapshot) => (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? '—' : v);

export function CloudStatusPage() {
  const [health, setHealth] = useState<Record<string, EngineHealth>>(getEnginesHealth());
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setHealth(getEnginesHealth()), 1500);
    return () => clearInterval(id);
  }, []);

  const runNow = async () => {
    setRunning(true);
    await engineRegistry.tick();
    setHealth(getEnginesHealth());
    setRunning(false);
  };

  const engines = engineRegistry.all();

  // Painel Global Cloud (PR #20): dados REAIS dos Nodes; sem dados => "—".
  const [cloud, setCloud] = useState<GlobalSnapshot | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => globalNodeManager.sync().then(() => alive && setCloud(globalNodeManager.snapshot())).catch(() => {});
    tick();
    const id2 = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id2); };
  }, []);
  const f = DASH(cloud || ({} as GlobalSnapshot));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary" /> Connected King Cloud Core
          </h1>
          <p className="text-slate-600 font-medium">
            Infraestrutura própria da Connected King: motores autónomos de storage, media, SEO, discovery e segurança.
          </p>
        </div>
        <Button onClick={runNow} disabled={running} className="rounded-xl bg-primary text-black font-bold hover:bg-primary/90">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} /> {running ? 'A executar' : 'Executar motores'}
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {engines.map((e) => {
          const h = health[e.id];
          const ok = h?.lastSuccess;
          return (
            <div key={e.id} className="bg-white/70 rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
              <div className={`mt-0.5 ${ok ? 'text-emerald-500' : h ? 'text-rose-500' : 'text-slate-400'}`}>
                {!h ? <Activity className="h-5 w-5" /> : ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800">{e.label}</div>
                <div className="text-xs text-slate-500 font-mono">{e.id}</div>
                <div className="text-sm text-slate-600 mt-1 truncate">{h ? h.lastMessage : 'Em espera'}</div>
                {h && (
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(h.lastRun).toLocaleTimeString()} · {h.lastDurationMs}ms
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PR #20 — Global Node/Region Manager (CEO panel) */}
      <div className="bg-white/70 rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-slate-800">Connected Cloud — Global Node Manager</h2>
          </div>
          <span className="text-xs text-slate-500">Dados reais dos Nodes · sem dados = "—"</span>
        </div>

        {!cloud ? (
          <div className="text-sm text-slate-500">A sincronizar com os Nodes…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Regiões" value={f(cloud.regions.length)} />
              <Stat label="Nodes" value={`${f(cloud.nodesOnline)}/${f(cloud.nodesTotal)}`} />
              <Stat label="Storage" value={`${f(cloud.storagePct)}%`} />
              <Stat label="Latência" value={`${f(cloud.latencyAvgMs)}ms`} />
              <Stat label="Uploads" value={f(cloud.uploads)} />
              <Stat label="Replicação" value={f(cloud.replication)} />
              <Stat label="Backups" value={f(cloud.backups)} />
              <Stat label="Segurança" value={f(cloud.security)} />
            </div>

            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-line">
              {cloud.routingNote}
            </div>

            <div className="space-y-1">
              {cloud.nodes.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
                  <span className="font-mono text-slate-700">{n.id}</span>
                  <span className="text-slate-500">{n.region}</span>
                  <span className={n.status === 'online' ? 'text-emerald-600 font-semibold' : n.status === 'degraded' ? 'text-amber-600 font-semibold' : 'text-slate-400 font-semibold'}>
                    {n.status === 'online' ? '🟢' : n.status === 'degraded' ? '🟡' : '⚪'} {n.status}
                  </span>
                  <span className="text-slate-500">{n.latencyMs ? `${n.latencyMs}ms` : '—'}</span>
                  <span className="text-slate-500">{(n.usedBytes / 1e9).toFixed(1)}GB</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Os motores correm a cada 2 minutos. Processamento pesado (transcoding, thumbnails, backups em disco) será
        delegado a Cloud Functions numa próxima fase, mantendo este orquestrador como interface única.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}
