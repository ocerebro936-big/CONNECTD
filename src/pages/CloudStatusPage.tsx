// ============================================================================
// Connected Cloud Status — painel de saúde dos motores autónomos
// ============================================================================
import React, { useEffect, useState } from 'react';
import { Cloud, Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { engineRegistry, getEnginesHealth, EngineHealth } from '../lib/connected-engine';
import { Button } from '../components/ui/button';

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary" /> Connected Cloud Core
          </h1>
          <p className="text-slate-600 font-medium">
            Infraestrutura própria da Connected: motores autónomos de storage, media, SEO, discovery e segurança.
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

      <p className="text-xs text-slate-500">
        Os motores correm a cada 2 minutos. Processamento pesado (transcoding, thumbnails, backups em disco) será
        delegado a Cloud Functions numa próxima fase, mantendo este orquestrador como interface única.
      </p>
    </div>
  );
}
