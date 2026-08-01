import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Activity, TrendingUp, Sparkles, ArrowUpRight, Crown, Briefcase, GraduationCap, FileText, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlatformStatus } from '../components/PlatformStatus';
import { DivinoTreasuryWidget } from '../components/DivinoTreasuryWidget';
import { AdminPanel } from '../components/AdminPanel';
import { formatCurrency } from '../lib/currency-utils';
import { collection, query, where, onSnapshot, addDoc, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const jobs = [
  { title: 'Moderador de Comunidade', salary: 12000, desc: 'Gestão de chats e suporte ao utilizador' },
  { title: 'Curador de Conteúdo TV', salary: 18000, desc: 'Organização de vídeos na Connect TV' },
  { title: 'Editor de Mídia', salary: 15000, desc: 'Edição de vídeos e thumbnails para criadores' },
  { title: 'Analista de Dados', salary: 25000, desc: 'Métricas de audiência e relatórios de desempenho' },
];

const courses = [
  { title: 'Como Monetizar Lives na Connect TV', type: 'Gratuito', color: 'indigo', desc: 'Estratégias para atrair Fãs e maximizar doações em tempo real.' },
  { title: 'Gestão de Direitos Autorais & Ativos Digitais', type: 'Certificado Oficial', color: 'purple', desc: 'Precificação e venda de obras na Galeria em Meticais (MZN).' },
  { title: 'Produção de Conteúdo 4K para a Jukebox', type: 'Gratuito', color: 'indigo', desc: 'Técnicas de gravação, edição e envio para a Connect TV.' },
  { title: 'Marketing Digital & Crescimento de Audiência', type: 'VIP', color: 'amber', desc: 'Estratégias avançadas de tráfego orgânico e anúncios na plataforma.' },
];

interface DashboardPageProps {
  user: any;
  posts: any[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, posts }) => {
  const [dashTab, setDashTab] = useState<'vip' | 'jobs' | 'academy' | 'creator'>('vip');
  const [followersCount, setFollowersCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [ratingSum, setRatingSum] = useState(0);
  const [appliedJob, setAppliedJob] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fq = query(collection(db, 'follows'), where('followingId', '==', user.uid));
    const unsub = onSnapshot(fq, (snap) => setFollowersCount(snap.size), (e) => console.error(e));
    return () => unsub();
  }, [user]);

  const myPosts = useMemo(() => posts.filter((p) => p.userId === user?.uid), [posts, user]);

  useEffect(() => {
    if (!user) return;
    let likes = 0;
    let comments = 0;
    let ratings = 0;
    let commentsFetched = 0;
    myPosts.forEach((p) => {
      likes += p.likes || 0;
      ratings += (p.ratings?.totalScore || 0);
      if (p.comments && p.comments > 0) {
        commentsFetched += 1;
      }
    });
    setLikesCount(likes);
    setRatingSum(ratings);
    const unsubs: any[] = [];
    myPosts.forEach((p) => {
      unsubs.push(onSnapshot(
        query(collection(db, 'posts', p.id, 'comments')),
        (snap) => { commentsFetched += snap.size; setCommentsCount(commentsFetched); },
        () => {}
      ));
    });
    return () => unsubs.forEach((u) => u());
  }, [myPosts, user]);

  const chartData = useMemo(() => {
    const months: Record<string, { name: string; posts: number; likes: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('pt-PT', { month: 'short' });
      months[key] = { name: key, posts: 0, likes: 0 };
    }
    myPosts.forEach((p) => {
      const d = new Date(p.createdAt);
      const key = d.toLocaleDateString('pt-PT', { month: 'short' });
      if (months[key]) {
        months[key].posts += 1;
        months[key].likes += p.likes || 0;
      }
    });
    return Object.values(months);
  }, [myPosts]);

  const platformData = useMemo(() => {
    if (!user) return [];
    const socials = user ? [['YouTube', 1], ['Instagram', 1], ['TikTok', 1], ['Facebook', 1]] : [];
    const connected = socials
      .map(([name, _]) => name)
      .filter((n) => {
        if (n === 'YouTube') return true;
        if (n === 'Instagram') return true;
        if (n === 'TikTok') return true;
        return true;
      });
    const values = connected.map((name) => {
      const count = myPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
      return { name, value: Math.max(1, Math.round(count / Math.max(1, connected.length))) };
    });
    return values;
  }, [myPosts, user]);

  const engagement = likesCount + commentsCount + Math.round(ratingSum);

  const downloadReport = () => {
    const csvRows: string[] = [];
    csvRows.push('Mês,Publicações,Curtidas');
    chartData.forEach((row) => {
      csvRows.push(`${row.name},${row.posts},${row.likes}`);
    });
    csvRows.push('');
    csvRows.push(`Seguidores,${followersCount}`);
    csvRows.push(`Engajamento Total,${engagement}`);
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-connected-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = async (title: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'applications'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        jobTitle: title,
        status: 'pending',
        createdAt: Date.now(),
      });
      setAppliedJob(title);
      setTimeout(() => setAppliedJob(null), 3000);
    } catch (e) {
      console.error('Error applying:', e);
      alert('Erro ao enviar candidatura.');
    }
  };

  const totalRatingCount = myPosts.reduce((acc, p) => acc + (p.totalRatings || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-700 font-medium text-base">As tuas métricas reais, ao vivo da plataforma.</p>
        </div>
        <Button className="rounded-xl shadow-md font-semibold" onClick={downloadReport}>Baixar Relatório</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Seguidores</CardTitle>
            <Users className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{followersCount}</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <span className="text-emerald-600 font-bold">Contagem real</span> via Firestore
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Engajamento Total</CardTitle>
            <Activity className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{engagement}</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <span className="text-slate-500 font-bold">{likesCount} likes · {commentsCount} comentários · {Math.round(ratingSum)} pontos de rating</span>
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Publicações</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{myPosts.length}</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <span className="text-slate-500 font-bold">{totalRatingCount} avaliações recebidas</span>
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Pontos</CardTitle>
            <Sparkles className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{(user as any)?.points ?? 0}</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <span className="text-amber-600 font-bold">Moeda interna da plataforma</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-900 font-bold">As Tuas Publicações</CardTitle>
            <CardDescription className="text-slate-600 font-medium">Atividade real dos últimos 7 meses.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#334155" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#334155" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <Area type="monotone" dataKey="posts" name="Publicações" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                  <Area type="monotone" dataKey="likes" name="Curtidas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-900 font-bold">Atividade Recente</CardTitle>
            <CardDescription className="text-slate-600 font-medium">As tuas publicações com mais engagement.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-auto">
              {[...myPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-white/50 border border-white/40 rounded-xl p-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.content || (p.media?.type === 'video' ? '🎬 Vídeo' : '📷 Foto')}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{new Date(p.createdAt).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 shrink-0">
                    <span className="text-rose-500">♥ {p.likes || 0}</span>
                    <span className="text-blue-500">💬 {p.comments || 0}</span>
                    <span className="text-amber-500">★ {p.totalRatings || 0}</span>
                  </div>
                </div>
              ))}
              {myPosts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8 font-medium">Ainda não publicaste nada. Vai ao Feed e cria a tua primeira publicação!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PlatformStatus />

      <DivinoTreasuryWidget />

      {(user?.email === 'ocerebro936@gmail.com' || user?.role === 'admin') && (
        <AdminPanel user={user} />
      )}

      <div className="pt-4 border-t border-slate-200/50">
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Oportunidades
        </h3>
        <p className="text-sm text-slate-600 mb-5">Cresça connosco — seja VIP, candidate-se a vagas ou aprenda na Faculdade Connected.</p>

        <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm overflow-x-auto">
          {([
            { id: 'vip' as const, label: '⭐ Seja Membro', color: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' },
            { id: 'jobs' as const, label: '💼 Quero Trabalhar', color: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' },
            { id: 'academy' as const, label: '🎓 Faculdade', color: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg' },
            { id: 'creator' as const, label: '🎥 Espaço Criador', color: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDashTab(tab.id)}
              className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                dashTab === tab.id ? tab.color : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {dashTab === 'vip' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200/50 pb-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Torne-se Membro VIP da Connected
                </h4>
                <p className="text-sm text-slate-600">Aumente os seus ganhos em Lives, obtenha selo de distinção e receba comissões sobre o tráfego gerado.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200/50 shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-5 space-y-4">
                    <h4 className="font-bold text-lg text-slate-900">Membro Pro</h4>
                    <p className="text-2xl font-black text-amber-600">{formatCurrency(250, 'MZN')} <span className="text-xs font-normal text-slate-500">/ mês</span></p>
                    <ul className="text-xs space-y-2 text-slate-700">
                      <li>✅ 80% de retenção de ganhos em Lives</li>
                      <li>✅ Selo de Membro Oficial no Perfil</li>
                      <li>✅ Acesso a chamadas de voz ilimitadas</li>
                    </ul>
                    <Button className="w-full rounded-xl font-bold bg-amber-600 hover:bg-amber-500 shadow-sm" onClick={() => alert('Subscrição Pro ativada! A funcionalidade completa estará disponível em breve.')}>Subscrever Agora</Button>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200/50 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-emerald-50 to-white">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg text-emerald-800">Membro Criador VIP</h4>
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">RECOMENDADO</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(750, 'MZN')} <span className="text-xs font-normal text-slate-500">/ mês</span></p>
                    <ul className="text-xs space-y-2 text-slate-700">
                      <li>✅ 90% de retenção em doações e presentes</li>
                      <li>✅ Distribuição de lucros de tráfego de anúncios</li>
                      <li>✅ Entrada direta no Museu Dinâmico</li>
                    </ul>
                    <Button className="w-full rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm text-white" onClick={() => { alert('Passe VIP ativado! Redirecionando para a rede de conexões...'); setDashTab('vip'); }}>Ativar Passe VIP</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {dashTab === 'jobs' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200/50 pb-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-500" />
                  Trabalhe na Connected
                </h4>
                <p className="text-sm text-slate-600">Candidate-se a vagas internas da plataforma e seja pago em Meticais (MZN).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job, i) => (
                  <Card key={i} className="border-slate-200/50 shadow-md hover:shadow-lg transition-all">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900">{job.title}</h4>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">{formatCurrency(job.salary, 'MZN')} / mês</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{job.desc}</p>
                      </div>
                      <Button size="sm" className="rounded-lg text-xs font-bold shrink-0 ml-4 bg-emerald-600 hover:bg-emerald-500 shadow-sm" onClick={() => handleApply(job.title)} disabled={appliedJob === job.title}>
                        {appliedJob === job.title ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enviada</> : 'Candidatar'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {dashTab === 'academy' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200/50 pb-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-500" />
                  Faculdade & Capacitação Digital
                </h4>
                <p className="text-sm text-slate-600">Aprenda a criar transmissões de alto impacto, gestão de audiência, programação e marketing digital.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course, i) => {
                  const colorMap: Record<string, string> = {
                    blue: 'bg-blue-100 text-blue-700 border-blue-300',
                    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
                    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                  };
                  return (
                    <Card key={i} className="border-slate-200/50 shadow-md hover:shadow-lg transition-all">
                      <CardContent className="p-5 space-y-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${colorMap[course.color] || colorMap.indigo}`}>{course.type}</span>
                        <h4 className="font-bold text-sm text-slate-900">{course.title}</h4>
                        <p className="text-xs text-slate-600">{course.desc}</p>
                        <Button size="sm" className="w-full rounded-lg text-xs font-bold mt-2 bg-indigo-600 hover:bg-indigo-500 shadow-sm" onClick={() => alert(`Redirecionando para a Faculdade Connected... O curso "${course.title}" será disponibilizado em breve.`)}>Acessar Curso</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {dashTab === 'creator' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200/50 pb-4">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Espaço Criador
                </h4>
                <p className="text-sm text-slate-600">Perfil profissional, monetização, gestão de conteúdos e análise de desempenho.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Monetização estimada', value: formatCurrency(Math.round(likesCount * 0.25 + Math.round(ratingSum) * 0.1), 'MZN'), hint: 'likes + avaliações do teu conteúdo', color: 'text-emerald-600' },
                  { label: 'Pontos ganhos com conteúdo', value: `${Math.round(likesCount * 0.5 + Math.round(ratingSum) * 0.2)} pts`, hint: 'estimativa de pontos por interação', color: 'text-indigo-600' },
                  { label: 'Conteúdos publicados', value: `${myPosts.length}`, hint: `${myPosts.filter(p => p.media).length} com mídia`, color: 'text-purple-600' },
                ].map((s) => (
                  <Card key={s.label} className="border-slate-200/50 shadow-md">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                      <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm">Melhor Conteúdo</CardTitle>
                    <CardDescription className="text-slate-600 font-medium text-xs">O teu post com mais engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const best = [...myPosts].sort((a, b) => (b.likes || 0) + (b.comments || 0) - ((a.likes || 0) + (a.comments || 0)))[0];
                      if (!best) return <p className="text-sm text-slate-500 font-medium text-center py-6">Publica o teu primeiro conteúdo para veres análises.</p>;
                      return (
                        <div className="bg-white/60 border border-slate-200 rounded-xl p-4">
                          <p className="text-sm font-bold text-slate-900 line-clamp-2">{best.content || (best.media?.type === 'video' ? '🎬 Vídeo' : '📷 Foto')}</p>
                          <div className="flex gap-3 mt-2 text-xs font-bold text-slate-600">
                            <span className="text-rose-500">♥ {best.likes || 0}</span>
                            <span className="text-blue-500">💬 {best.comments || 0}</span>
                            <span className="text-amber-500">★ {(best.averageRating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-slate-900 font-bold text-sm">Horário de Melhor Desempenho</CardTitle>
                    <CardDescription className="text-slate-600 font-medium text-xs">Hora do dia com mais publicações e likes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      if (myPosts.length === 0) return <p className="text-sm text-slate-500 font-medium text-center py-6">Sem dados suficientes.</p>;
                      const hours = myPosts.reduce<Record<string, { count: number; likes: number }>>((acc, p) => {
                        const h = new Date(p.createdAt).getHours();
                        acc[h] = { count: (acc[h]?.count || 0) + 1, likes: (acc[h]?.likes || 0) + (p.likes || 0) };
                        return acc;
                      }, {});
                      const entries = Object.entries(hours) as [string, { count: number; likes: number }][];
                      const bestHour = entries.sort((a, b) => (b[1].likes + b[1].count * 5) - (a[1].likes + a[1].count * 5))[0];
                      return (
                        <div className="bg-white/60 border border-slate-200 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-indigo-600">{bestHour[0]}:00</p>
                          <p className="text-xs text-slate-600 font-semibold mt-1">
                            {bestHour[1].count} publicações · {bestHour[1].likes} likes a esta hora
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">Publica perto desta hora para maximizar o alcance.</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200/50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-slate-900 font-bold text-sm">Gestão de Conteúdos</CardTitle>
                  <CardDescription className="text-slate-600 font-medium text-xs">Os teus posts — clica em remover para apagar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[350px] overflow-auto">
                    {[...myPosts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-white/60 border border-slate-200 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.content || (p.media?.type === 'video' ? '🎬 Vídeo' : '📷 Foto')}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {new Date(p.createdAt).toLocaleString('pt-PT')} · ♥ {p.likes || 0} · 💬 {p.comments || 0}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={async () => {
                            if (!confirm('Apagar esta publicação?')) return;
                            try {
                              await deleteDoc(doc(db, 'posts', p.id));
                            } catch (e) {
                              console.error('Error deleting post:', e);
                              alert('Erro ao apagar publicação.');
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    {myPosts.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-6 font-medium">Sem conteúdos. Publica no Feed para começar a crescer!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { DashboardPage };
export default DashboardPage;
