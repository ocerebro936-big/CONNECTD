import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Users, BarChart3, Globe, ShieldCheck, Activity, Clock, TrendingUp, Database, Cpu, HardDrive, Wifi, Lock } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

type Tab = 'usage' | 'content' | 'network' | 'security';

const toMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
};

const ONLINE_WINDOW = 2 * 60 * 1000;

export function TrafficPanel() {
  const [tab, setTab] = useState<Tab>('usage');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [latencyProbe, setLatencyProbe] = useState(false);
  const [storageEst, setStorageEst] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map((d) => d.data())), (e) => console.error(e)),
      onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snap) => setPosts(snap.docs.map((d) => d.data())), (e) => console.error(e)),
      onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc')), (snap) => setStories(snap.docs.map((d) => d.data())), (e) => console.error(e)),
      onSnapshot(query(collection(db, 'gallery_items'), orderBy('createdAt', 'desc')), (snap) => setGallery(snap.docs.map((d) => d.data())), (e) => console.error(e)),
      onSnapshot(collection(db, 'reports'), (snap) => setReports(snap.docs.map((d) => d.data())), (e) => console.error(e)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const measureLatency = async () => {
    setLatencyProbe(true);
    try {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await fetch(`${window.location.origin}/sw.js?probe=${Date.now()}`, { cache: 'no-store', mode: 'no-cors' });
        samples.push(performance.now() - t0);
      }
      setLatency(Math.min(...samples));
    } catch {
      setLatency(null);
    } finally {
      setLatencyProbe(false);
    }
  };

  useEffect(() => {
    measureLatency();
    navigator.storage?.estimate?.().then((est) => {
      setStorageEst({ used: est.usage || 0, quota: est.quota || 0 });
    }).catch(() => {});
    const t = setInterval(measureLatency, 60000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const online = users.filter((u) => toMillis(u.lastActive) > now - ONLINE_WINDOW).length;
  const banned = users.filter((u) => u.banned).length;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 86400000;
  const createdToday = users.filter((u) => toMillis(u.createdAt) >= dayStart.getTime()).length;
  const createdWeek = users.filter((u) => toMillis(u.createdAt) >= weekAgo).length;

  const photos = posts.filter((p) => p.media?.type === 'photo').length;
  const videos = posts.filter((p) => p.media?.type === 'video').length;
  const reels = posts.filter((p) => p.media?.type === 'reel').length;
  const textPosts = posts.length - photos - videos - reels;
  const comments = posts.reduce((acc, p) => acc + (p.comments || 0), 0);
  const likes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const activeStories = stories.filter((s) => !s.expiresAt || toMillis(s.expiresAt) > now).length;

  const reportsTotal = reports.length;
  const reportsPending = reports.filter((r) => r.status === 'pending').length;
  const reportsResolved = reports.filter((r) => r.status === 'resolved' || r.status === 'banned').length;
  const reportsBanned = reports.filter((r) => r.status === 'banned').length;

  const mem = (performance as any).memory;
  const conn = (navigator as any).connection;
  const fmt = (n: number) => n.toLocaleString('pt-PT');
  const fmtBytes = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  const statCard = (label: string, value: string, sub?: string, icon?: React.ReactNode) => (
    <Card className="glass-card border-white/30 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-xl font-black text-slate-900">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'usage', label: 'Utilização', icon: <Users className="h-4 w-4" />, color: 'bg-emerald-600 text-white' },
    { id: 'content', label: 'Conteúdo', icon: <BarChart3 className="h-4 w-4" />, color: 'bg-blue-600 text-white' },
    { id: 'network', label: 'Rede', icon: <Activity className="h-4 w-4" />, color: 'bg-violet-600 text-white' },
    { id: 'security', label: 'Segurança', icon: <ShieldCheck className="h-4 w-4" />, color: 'bg-rose-600 text-white' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1.5 bg-white/70 rounded-xl border border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === t.id ? t.color : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'usage' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCard('Utilizadores online', `${online}`, `agora (ativos nos últimos 2 min)`, <Users className="h-4 w-4 text-emerald-600" />)}
          {statCard('Sessões ativas', `${fmt(online)}`, 'sessões abertas em tempo real', <Activity className="h-4 w-4 text-emerald-600" />)}
          {statCard('Total de utilizadores', fmt(users.length), `banidos: ${banned}`, <Globe className="h-4 w-4 text-blue-600" />)}
          {statCard('Crescimento hoje', `+${createdToday}`, 'novos registos desde meia-noite', <TrendingUp className="h-4 w-4 text-emerald-600" />)}
          {statCard('Crescimento 7 dias', `+${createdWeek}`, 'novos registos na última semana', <Clock className="h-4 w-4 text-amber-600" />)}
          {statCard('Tempo médio de sessão', 'n/a', 'disponível com DIVINO IA + Connected Cloud', <Clock className="h-4 w-4 text-slate-500" />)}
        </div>
      )}

      {tab === 'content' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCard('Publicações totais', fmt(posts.length), 'posts no feed global', <BarChart3 className="h-4 w-4 text-blue-600" />)}
          {statCard('Fotografias', fmt(photos), `${((photos / Math.max(posts.length, 1)) * 100).toFixed(0)}% do conteúdo`, <BarChart3 className="h-4 w-4 text-blue-600" />)}
          {statCard('Vídeos', fmt(videos), 'vídeos publicados no feed', <BarChart3 className="h-4 w-4 text-violet-600" />)}
          {statCard('Reels', fmt(reels), 'vídeos curtos verticais', <BarChart3 className="h-4 w-4 text-rose-600" />)}
          {statCard('Texto', fmt(textPosts), 'publicações sem mídia', <BarChart3 className="h-4 w-4 text-slate-600" />)}
          {statCard('Comentários', fmt(comments), `♥ ${fmt(likes)} gostos no total`, <BarChart3 className="h-4 w-4 text-amber-600" />)}
          {statCard('Stories ativas', fmt(activeStories), 'stories com menos de 24h', <BarChart3 className="h-4 w-4 text-emerald-600" />)}
          {statCard('Galeria', fmt(gallery.length), 'mídias no museu', <BarChart3 className="h-4 w-4 text-indigo-600" />)}
        </div>
      )}

      {tab === 'network' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCard('Latência (origin)', latency !== null ? `${latency.toFixed(0)} ms` : '—', 'mínimo de 3 sondas, atualiza a cada 60s', <Activity className="h-4 w-4 text-violet-600" />)}
          {statCard('CPU (núcleos)', `${(navigator as any).hardwareConcurrency || '—'}`, 'lógicos disponíveis neste dispositivo', <Cpu className="h-4 w-4 text-violet-600" />)}
          {statCard('Memória em uso', mem ? fmtBytes(mem.usedJSHeapSize) : 'n/a', mem ? `total do heap: ${fmtBytes(mem.totalJSHeapSize)}` : 'browser sem exposição', <Database className="h-4 w-4 text-violet-600" />)}
          {statCard('Armazenamento local', storageEst ? fmtBytes(storageEst.used) : '—', storageEst ? `cota: ${fmtBytes(storageEst.quota)}` : 'indisponível', <HardDrive className="h-4 w-4 text-violet-600" />)}
          {statCard('Largura de banda', conn?.downlink ? `${conn.downlink} Mbps` : '—', conn?.effectiveType ? `tipo: ${conn.effectiveType}` : 'API não exposta', <Wifi className="h-4 w-4 text-violet-600" />)}
          {statCard('Monitorização', 'Realtime', 'Firestore onSnapshot + sondas de rede', <Globe className="h-4 w-4 text-emerald-600" />)}
        </div>
      )}

      {tab === 'security' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCard('Denúncias totais', fmt(reportsTotal), 'histórico de moderação', <Lock className="h-4 w-4 text-rose-600" />)}
          {statCard('Pendentes', fmt(reportsPending), 'aguardam ação do admin', <Lock className="h-4 w-4 text-amber-600" />)}
          {statCard('Resolvidas', fmt(reportsResolved), 'casos concluídos', <Lock className="h-4 w-4 text-emerald-600" />)}
          {statCard('Banidas', fmt(reportsBanned), 'denúncias que resultaram em ban', <Lock className="h-4 w-4 text-rose-600" />)}
          {statCard('Utilizadores banidos', fmt(banned), 'contas com ban ativo', <ShieldCheck className="h-4 w-4 text-rose-600" />)}
          {statCard('Proteção', 'Ativa', 'Firebase Auth + regras Firestore + storage rules', <ShieldCheck className="h-4 w-4 text-emerald-600" />)}
        </div>
      )}

      <p className="text-[10px] text-slate-500 font-medium">
        Módulo de validação de tráfego — dados reais de Firestore (utilizadores, posts, stories, galeria, denúncias) e do dispositivo (rede, memória, armazenamento).
      </p>
    </div>
  );
}
