import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Sparkles, TrendingUp, TrendingDown, Users, MessageSquare, Activity, MessageCircle, Heart, Wallet, BarChart3, Server, ShieldAlert, Lightbulb, FileDown, Gauge, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { divinoTreasury } from '../lib/divino-treasury';
import { formatCurrency } from '../lib/currency-utils';

interface AiInsightsPageProps {
  user: any;
  allUsers: any[];
  posts: any[];
  messages: any[];
}

type Tab = 'financeiro' | 'previsoes' | 'infra' | 'moderacao' | 'sugestoes';

const AiInsightsPage: React.FC<AiInsightsPageProps> = ({ user, allUsers, posts, messages }) => {
  const [tab, setTab] = useState<Tab>('financeiro');
  const [confirmedPurchases, setConfirmedPurchases] = useState<any[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [pendingGames, setPendingGames] = useState<any[]>([]);
  const [infraResults, setInfraResults] = useState<Record<string, { ok: boolean; ms: number; detail?: string }>>({});
  const [infraChecked, setInfraChecked] = useState(false);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'purchases'), where('status', '==', 'confirmed')), (snap) => {
        setConfirmedPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, () => {}),
      onSnapshot(query(collection(db, 'purchases'), where('status', '==', 'pending')), (snap) => {
        setPendingPurchases(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, () => {}),
      onSnapshot(query(collection(db, 'reports'), where('status', '==', 'pending')), (snap) => {
        setPendingReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, () => {}),
      onSnapshot(query(collection(db, 'games'), where('status', '==', 'pending')), (snap) => {
        setPendingGames(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, () => {}),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const totalUsers = allUsers.length;
  const totalPosts = posts.length;
  const totalMessages = messages.length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalComments = posts.reduce((acc, p) => acc + (p.comments || 0), 0);

  const treasury = divinoTreasury.getBalance();
  const receipts = divinoTreasury.getReceipts();

  const revenue = useMemo(() => confirmedPurchases.reduce((acc, p) => acc + (p.price || 0), 0), [confirmedPurchases]);
  const revenuePoints = useMemo(() => confirmedPurchases.reduce((acc, p) => acc + (p.points || 0), 0), [confirmedPurchases]);
  const expenses = receipts.filter((r) => r.status === 'liquidado').reduce((acc, r) => acc + r.amount, 0);
  const net = revenue - expenses;

  const weeklyActivity = useMemo(() => {
    const now = Date.now();
    const weeks: { name: string; posts: number; likes: number; messages: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = now - (i + 1) * 7 * 86400000;
      const end = now - i * 7 * 86400000;
      const weekPosts = posts.filter((p) => p.createdAt >= start && p.createdAt < end).length;
      const weekLikes = posts.filter((p) => p.createdAt >= start && p.createdAt < end).reduce((a, p) => a + (p.likes || 0), 0);
      const weekMessages = messages.filter((m) => (m.createdAt || 0) >= start && (m.createdAt || 0) < end).length;
      weeks.push({
        name: `S${i - 3}`,
        posts: weekPosts,
        likes: weekLikes,
        messages: weekMessages,
      });
    }
    return weeks;
  }, [posts, messages]);

  const forecast = useMemo(() => {
    const values = weeklyActivity.map((w) => w.posts);
    const n = values.length;
    if (n < 2) return null;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((a, v, i) => a + i * v, 0);
    const sumXX = values.reduce((a, _, i) => a + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const next = Math.max(0, Math.round(intercept + slope * n));
    return { next, slope, growing: slope >= 0 };
  }, [weeklyActivity]);

  const runInfraCheck = async () => {
    setInfraChecked(true);
    const results: Record<string, { ok: boolean; ms: number; detail?: string }> = {};

    const t0 = performance.now();
    try {
      await getDoc(doc(db, 'users', user?.uid || '__nouser__'));
      results.firestore = { ok: true, ms: Math.round(performance.now() - t0), detail: 'Leitura Firestore OK' };
    } catch (e) {
      results.firestore = { ok: false, ms: Math.round(performance.now() - t0), detail: 'Firestore indisponível' };
    }

    results.network = { ok: navigator.onLine, ms: 0, detail: navigator.onLine ? 'Ligação ativa' : 'OFFLINE' };
    results.sw = {
      ok: 'serviceWorker' in navigator,
      ms: 0,
      detail: 'serviceWorker' in navigator ? 'Service Worker registado (PWA)' : 'SW indisponível',
    };

    const conn = (navigator as any).connection;
    results.connection = {
      ok: true,
      ms: 0,
      detail: conn ? `${conn.effectiveType} · ${Math.max(0, Math.round((conn.downlink || 0) * 100) / 100)} Mbps` : 'Sem dados de rede',
    };

    setInfraResults(results);
  };

  const downloadReport = () => {
    const rows: string[] = [];
    rows.push('RELATÓRIO DIVINO IA — CONNECTED');
    rows.push(`Gerado: ${new Date().toLocaleString('pt-PT')}`);
    rows.push('');
    rows.push('=== FINANCEIRO ===');
    rows.push(`Receitas confirmadas,${formatCurrency(revenue, 'MZN')}`);
    rows.push(`Pontos vendidos,${revenuePoints}`);
    rows.push(`Despesas liquidadas,${formatCurrency(expenses, 'MZN')}`);
    rows.push(`Resultado líquido,${formatCurrency(net, 'MZN')}`);
    rows.push(`Saldo tesouraria,${treasury.balanceFormatted}`);
    rows.push('');
    rows.push('=== ATIVIDADE ===');
    rows.push(`Utilizadores,${totalUsers}`);
    rows.push(`Publicações,${totalPosts}`);
    rows.push(`Mensagens,${totalMessages}`);
    rows.push(`Likes,${totalLikes}`);
    rows.push(`Comentários,${totalComments}`);
    rows.push('');
    rows.push('=== ATIVIDADE SEMANAL ===');
    rows.push('Semana,Publicações,Curtidas,Mensagens');
    weeklyActivity.forEach((w) => rows.push(`${w.name},${w.posts},${w.likes},${w.messages}`));
    rows.push('');
    rows.push('=== TRANSAÇÕES TESOURARIA ===');
    rows.push('ID,Serviço,Montante,Estado,Data');
    receipts.forEach((r) => rows.push(`${r.id},${r.service},${r.amount},${r.status},${r.timestamp}`));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-divino-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const suggestions = useMemo(() => {
    const list: { icon: string; title: string; desc: string; priority: 'alta' | 'media' | 'baixa' }[] = [];
    if (net < 0) {
      list.push({ icon: '⚠️', title: 'Resultado líquido negativo', desc: 'As despesas excedem as receitas confirmadas. Considera rever custos de infraestrutura ou acelerar o processo de confirmação de compras.', priority: 'alta' });
    }
    if (pendingPurchases.length > 0) {
      list.push({ icon: '💰', title: `${pendingPurchases.length} compra(s) pendente(s) de confirmação`, desc: 'Confirmar compras pendentes liberta receita e melhora a experiência do utilizador.', priority: pendingPurchases.length > 3 ? 'alta' : 'media' });
    }
    if (totalPosts > 0 && totalLikes / totalPosts < 2) {
      list.push({ icon: '🔥', title: 'Engajamento baixo nos posts', desc: 'Média de likes por publicação baixa. Sugere desafios de conteúdo ou destaque para criadores ativos.', priority: 'media' });
    }
    if (pendingReports.length > 0) {
      list.push({ icon: '🛡️', title: `${pendingReports.length} denúncia(s) por rever`, desc: 'Denúncias antigas degradam a confiança da comunidade. Prioriza a moderação.', priority: pendingReports.length > 5 ? 'alta' : 'media' });
    }
    if (pendingGames.length > 0) {
      list.push({ icon: '🎮', title: `${pendingGames.length} jogo(s) por aprovar`, desc: 'Aprovar jogos novos enriquece o catálogo e atrai utilizadores.', priority: 'baixa' });
    }
    if (forecast && forecast.growing) {
      list.push({ icon: '📈', title: 'Crescimento projetado', desc: `Projeção de ${forecast.next} publicações na próxima semana (tendência positiva). Mantém a cadência atual.`, priority: 'baixa' });
    }
    if (list.length === 0) {
      list.push({ icon: '✅', title: 'Ecossistema saudável', desc: 'Sem anomalias detetadas. Continua a manter a plataforma ativa.', priority: 'baixa' });
    }
    return list;
  }, [net, pendingPurchases, totalPosts, totalLikes, pendingReports, pendingGames, forecast]);

  const topUsers = [...allUsers]
    .filter(u => u.uid !== user?.uid)
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 3);

  const priorityColor: Record<string, string> = {
    alta: 'bg-rose-100 text-rose-700 border-rose-300',
    media: 'bg-amber-100 text-amber-700 border-amber-300',
    baixa: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'financeiro', label: '💼 Financeiro', icon: <Wallet className="h-4 w-4" />, color: 'bg-emerald-600 text-white' },
    { id: 'previsoes', label: '📈 Previsões', icon: <BarChart3 className="h-4 w-4" />, color: 'bg-indigo-600 text-white' },
    { id: 'infra', label: '🖥️ Infraestrutura', icon: <Server className="h-4 w-4" />, color: 'bg-cyan-600 text-white' },
    { id: 'moderacao', label: '🛡️ Moderação', icon: <ShieldAlert className="h-4 w-4" />, color: 'bg-rose-600 text-white' },
    { id: 'sugestoes', label: '💡 Sugestões', icon: <Lightbulb className="h-4 w-4" />, color: 'bg-amber-600 text-white' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" /> DIVINO IA — Gestor do Ecossistema
          </h2>
          <p className="text-slate-700 font-medium text-base">Acompanha receitas, despesas, crescimento e infraestrutura. As decisões financeiras críticas permanecem sob controlo da administração.</p>
        </div>
        <Button className="rounded-xl shadow-md font-semibold" onClick={downloadReport}>
          <FileDown className="h-4 w-4 mr-1" /> Relatório CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-primary/20 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold text-xl">
              <Activity className="h-6 w-6" />
              Métricas da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Users className="h-4 w-4" />, label: 'Utilizadores', value: totalUsers },
                { icon: <MessageSquare className="h-4 w-4" />, label: 'Publicações', value: totalPosts },
                { icon: <MessageCircle className="h-4 w-4" />, label: 'Mensagens', value: totalMessages },
                { icon: <Heart className="h-4 w-4" />, label: 'Likes Totais', value: totalLikes },
              ].map((m) => (
                <div key={m.label} className="glass-input rounded-xl p-4 border-white/60 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">{m.icon} {m.label}</div>
                  <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold text-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              Top Membros
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium text-xs">
              Utilizadores com maior pontuação na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topUsers.map((u, i) => (
              <div key={u.uid} className="flex items-center gap-3 glass-input rounded-xl p-3 shadow-sm border border-white/20">
                <span className="text-lg font-black text-slate-400 w-6">{i + 1}</span>
                <Avatar className="h-10 w-10 border border-white/50 shadow-sm">
                  <AvatarImage src={u.photoURL} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{u.displayName || 'Utilizador'}</p>
                  <p className="text-xs text-slate-500">{u.points || 0} pts</p>
                </div>
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              </div>
            ))}
            {topUsers.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Ainda não há membros na plataforma.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === t.id ? t.color : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card border-emerald-200/40 shadow-md">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Receitas Confirmadas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(revenue, 'MZN')}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{confirmedPurchases.length} compras · {revenuePoints} pontos emitidos</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-rose-200/40 shadow-md">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> Despesas Liquidadas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(expenses, 'MZN')}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tesouraria automática DIVINO</p>
              </CardContent>
            </Card>
            <Card className={`glass-card shadow-md ${net >= 0 ? 'border-emerald-300/60' : 'border-rose-300/60'}`}>
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase flex items-center gap-1 text-slate-500"><Activity className="h-3.5 w-3.5" /> Resultado Líquido</p>
                <p className={`text-2xl font-black mt-1 ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(net, 'MZN')}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{net >= 0 ? 'Receita &gt; despesa' : 'Despesa &gt; receita'}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-amber-200/40 shadow-md">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Tesouraria</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{treasury.balanceFormatted}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Gasto hoje: {treasury.spentTodayFormatted} · Limite: {treasury.dailyLimit} MT</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-white/30 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-900 font-bold text-lg">Transações da Tesouraria</CardTitle>
              <CardDescription className="text-slate-600 font-medium text-xs">Despesas autorizadas registadas pela DIVINO IA (pagamentos reais seguem as políticas da Bluewhite Corporation Lda.)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {receipts.length === 0 && <p className="text-sm text-slate-500 text-center py-4 font-medium">Sem transações ainda.</p>}
                {receipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 bg-white/50 border border-slate-100 rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{r.service}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.id} · {new Date(r.timestamp).toLocaleString('pt-PT')}</p>
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-full border ${r.status === 'liquidado' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.status === 'pendente' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                      {r.status === 'liquidado' ? '✓ ' : ''}{formatCurrency(r.amount, 'MZN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'previsoes' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card border-white/30 shadow-md md:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-900 font-bold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" /> Atividade Semanal (4 semanas)
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium text-xs">Base para as projeções de crescimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {weeklyActivity.map((w) => (
                  <div key={w.name} className="bg-white/50 border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">{w.name}</p>
                    <p className="text-lg font-black text-indigo-600">{w.posts}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">publicações</p>
                    <p className="text-xs font-bold text-rose-500 mt-1">♥ {w.likes}</p>
                    <p className="text-xs font-bold text-cyan-600">💬 {w.messages}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-indigo-200/40 shadow-md">
            <CardContent className="p-6">
              <p className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> Projeção de Publicações</p>
              {forecast ? (
                <>
                  <p className="text-3xl font-black text-slate-900 mt-2">{forecast.next}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    próxima semana · tendência {forecast.growing ? 'crescente' : 'decrescente'} ({forecast.slope >= 0 ? '+' : ''}{forecast.slope.toFixed(1)}/semana)
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-2 font-medium">Dados insuficientes para projetar. Publica mais conteúdo para obter previsões.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-amber-200/40 shadow-md">
            <CardContent className="p-6">
              <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Ritmo da Economia</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{revenuePoints}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">pontos emitidos · {confirmedPurchases.length} transações confirmadas</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">taxa de confirmação: {confirmedPurchases.length + pendingPurchases.length > 0 ? Math.round((confirmedPurchases.length / (confirmedPurchases.length + pendingPurchases.length)) * 100) : 100}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'infra' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-600 font-medium">Diagnóstico rápido da infraestrutura. Executa o check-up para medir a saúde dos serviços em tempo real.</p>
            <Button className="rounded-xl font-bold" onClick={runInfraCheck}>
              <Gauge className="h-4 w-4 mr-1" /> {infraChecked ? 'Reexecutar Check-up' : 'Executar Check-up'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(infraResults).length === 0 && !infraChecked && (
              <Card className="md:col-span-2 glass-card border-white/30 shadow-md">
                <CardContent className="p-8 text-center">
                  <Server className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">A monitorização está pronta. Executa o check-up para ver o estado dos serviços.</p>
                </CardContent>
              </Card>
            )}
            {(Object.entries(infraResults) as [string, { ok: boolean; ms: number; detail?: string }][]).map(([key, res]) => (
              <Card key={key} className={`glass-card shadow-md ${res.ok ? 'border-emerald-300/50' : 'border-rose-300/60'}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {res.ok ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <ShieldAlert className="h-8 w-8 text-rose-500" />}
                    <div>
                      <p className="font-bold text-slate-900 text-sm capitalize">{key}</p>
                      <p className="text-xs text-slate-500 font-semibold">{res.detail || ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full border ${res.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                    {res.ok ? 'OK' : 'FALHA'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'moderacao' && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Denúncias por rever', count: pendingReports.length, icon: <ShieldAlert className="h-5 w-5" />, color: 'text-rose-600', hint: 'reports pendentes' },
            { label: 'Jogos por aprovar', count: pendingGames.length, icon: <Sparkles className="h-5 w-5" />, color: 'text-indigo-600', hint: 'games pendentes' },
            { label: 'Compras por confirmar', count: pendingPurchases.length, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600', hint: 'purchases pendentes' },
          ].map((m) => (
            <Card key={m.label} className="glass-card border-white/30 shadow-md">
              <CardContent className="p-6 text-center">
                <div className={`mx-auto mb-2 ${m.color}`}>{m.icon}</div>
                <p className="text-4xl font-black text-slate-900">{m.count}</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{m.label}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{m.hint} · ao vivo</p>
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-3 glass-card border-white/30 shadow-md">
            <CardContent className="p-5">
              <p className="text-sm text-slate-600 font-medium">
                A DIVINO IA apoia a moderação destacando o volume pendente. As decisões finais de banimento e aprovação são tomadas pela administração no <span className="font-bold">Painel de Moderação</span> (Dashboard).
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sugestoes' && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={i} className="glass-card border-white/30 shadow-md">
              <CardContent className="p-5 flex items-start gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${priorityColor[s.priority]}`}>
                      {s.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { AiInsightsPage };
export default AiInsightsPage;
