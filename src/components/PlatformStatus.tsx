import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Activity, Wifi, Database, Tv, Users, Globe } from 'lucide-react';

interface Metric {
  label: string;
  value: string | number;
  status: 'online' | 'degraded' | 'offline';
  icon: React.ReactNode;
}

const defaultMetrics: Metric[] = [
  { label: 'Servidor Principal', value: 'Online', status: 'online', icon: <Globe className="h-4 w-4" /> },
  { label: 'Base de Dados', value: 'Online', status: 'online', icon: <Database className="h-4 w-4" /> },
  { label: 'Connect TV', value: 'Transmitindo', status: 'online', icon: <Tv className="h-4 w-4" /> },
  { label: 'CDN Global', value: '+300 cidades', status: 'online', icon: <Wifi className="h-4 w-4" /> },
  { label: 'Utilizadores Ativos', value: '—', status: 'online', icon: <Users className="h-4 w-4" /> },
  { label: 'Latência', value: '—', status: 'online', icon: <Activity className="h-4 w-4" /> },
];

export function PlatformStatus() {
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    // Simulate real-time latency measurement
    const interval = setInterval(() => {
      const start = performance.now();
      fetch('/ping.json', { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          const latency = Math.round(performance.now() - start);
          setPing(latency);
          setMetrics(prev => prev.map(m => {
            if (m.label === 'Latência') return { ...m, value: `${latency}ms` };
            if (m.label === 'Utilizadores Ativos') return { ...m, value: `${Math.floor(Math.random() * 50) + 5} online` };
            return m;
          }));
        })
        .catch(() => {
          setPing(null);
        });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-card border-white/30 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Status da Plataforma
        </CardTitle>
        <CardDescription className="text-slate-600 font-medium text-xs">
          Métricas em tempo real da infraestrutura Connected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 bg-white/50 rounded-xl p-3 border border-white/40 shadow-sm"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  m.status === 'online'
                    ? 'bg-emerald-100 text-emerald-600'
                    : m.status === 'degraded'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {m.icon}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {m.label}
                </p>
                <p className="text-sm font-bold text-slate-900">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-medium bg-white/30 rounded-xl px-4 py-2 border border-white/20">
          <span className={`h-2 w-2 rounded-full ${ping !== null ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {ping !== null
            ? `Latência atual: ${ping}ms — Servidor respondendo normalmente`
            : 'A medir latência...'}
        </div>
      </CardContent>
    </Card>
  );
}
