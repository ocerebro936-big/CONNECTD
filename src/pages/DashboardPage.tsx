import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Activity, TrendingUp, Sparkles, ArrowUpRight, ArrowDownRight, Crown, Briefcase, GraduationCap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlatformStatus } from '../components/PlatformStatus';
import { DivinoTreasuryWidget } from '../components/DivinoTreasuryWidget';
import { formatCurrency } from '../lib/currency-utils';

interface DashboardPageProps {
  handleComingSoon: () => void;
}

const data = [
  { name: 'Jan', followers: 4000, engagement: 2400 },
  { name: 'Feb', followers: 3000, engagement: 1398 },
  { name: 'Mar', followers: 2000, engagement: 9800 },
  { name: 'Apr', followers: 2780, engagement: 3908 },
  { name: 'May', followers: 1890, engagement: 4800 },
  { name: 'Jun', followers: 2390, engagement: 3800 },
  { name: 'Jul', followers: 3490, engagement: 4300 },
];

const platformData = [
  { name: 'YouTube', value: 45 },
  { name: 'Instagram', value: 30 },
  { name: 'TikTok', value: 15 },
  { name: 'Facebook', value: 10 },
];

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

const DashboardPage: React.FC<DashboardPageProps> = ({ handleComingSoon }) => {
  const [dashTab, setDashTab] = useState<'vip' | 'jobs' | 'academy'>('vip');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-700 font-medium text-base">Bem-vindo de volta! Aqui está o resumo da sua vida digital.</p>
        </div>
        <Button className="rounded-xl shadow-md font-semibold" onClick={handleComingSoon}>Baixar Relatório</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Total de Seguidores</CardTitle>
            <Users className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">124.5K</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600 font-bold">+12.5%</span> em relação ao mês passado
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Engajamento Total</CardTitle>
            <Activity className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1.2M</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600 font-bold">+8.2%</span> em relação ao mês passado
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Conteúdos Virais</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <ArrowDownRight className="mr-1 h-3 w-3 text-rose-600" />
              <span className="text-rose-600 font-bold">-2</span> em relação ao mês passado
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">Reputação</CardTitle>
            <Sparkles className="h-4 w-4 text-slate-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Top 5%</div>
            <p className="text-xs text-slate-600 font-medium flex items-center mt-1">
              <span className="text-emerald-600 font-bold">+2 posições</span> no ranking global
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-900 font-bold">Crescimento de Audiência</CardTitle>
            <CardDescription className="text-slate-600 font-medium">Visão consolidada de todas as suas redes nos últimos 7 meses.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                  <YAxis stroke="#334155" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <Area type="monotone" dataKey="followers" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                  <Area type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-slate-900 font-bold">Distribuição por Rede</CardTitle>
            <CardDescription className="text-slate-600 font-medium">Onde sua audiência está mais ativa.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                  <XAxis type="number" stroke="#334155" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#334155" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.2)'}} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlatformStatus />

      <DivinoTreasuryWidget />

      <div className="pt-4 border-t border-slate-200/50">
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Oportunidades
        </h3>
        <p className="text-sm text-slate-600 mb-5">Cresça connosco — seja VIP, candidate-se a vagas ou aprenda na Faculdade Connected.</p>

        <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm overflow-x-auto">
          {([
            { id: 'vip' as const, label: '⭐ Seja Membro', color: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg' },
            { id: 'jobs' as const, label: '💼 Quero Trabalhar', color: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' },
            { id: 'academy' as const, label: '🎓 Faculdade', color: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' },
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
                    <Button className="w-full rounded-xl font-bold bg-amber-600 hover:bg-amber-500 shadow-sm">Subscrever Agora</Button>
                  </CardContent>
                </Card>
                <Card className="border-amber-200/50 shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-amber-50 to-white">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg text-amber-800">Membro Criador VIP</h4>
                      <span className="text-[10px] bg-amber-600 text-white font-black px-2 py-0.5 rounded-full">RECOMENDADO</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600">{formatCurrency(750, 'MZN')} <span className="text-xs font-normal text-slate-500">/ mês</span></p>
                    <ul className="text-xs space-y-2 text-slate-700">
                      <li>✅ 90% de retenção em doações e presentes</li>
                      <li>✅ Distribuição de lucros de tráfego de anúncios</li>
                      <li>✅ Entrada direta no Museu Dinâmico</li>
                    </ul>
                    <Button className="w-full rounded-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 shadow-sm text-white">Ativar Passe VIP</Button>
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
                      <Button size="sm" className="rounded-lg text-xs font-bold shrink-0 ml-4 bg-emerald-600 hover:bg-emerald-500 shadow-sm">Candidatar</Button>
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
                    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
                    purple: 'bg-purple-100 text-purple-700 border-purple-300',
                    amber: 'bg-amber-100 text-amber-700 border-amber-300',
                  };
                  return (
                    <Card key={i} className="border-slate-200/50 shadow-md hover:shadow-lg transition-all">
                      <CardContent className="p-5 space-y-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${colorMap[course.color] || colorMap.indigo}`}>{course.type}</span>
                        <h4 className="font-bold text-sm text-slate-900">{course.title}</h4>
                        <p className="text-xs text-slate-600">{course.desc}</p>
                        <Button size="sm" className="w-full rounded-lg text-xs font-bold mt-2 bg-indigo-600 hover:bg-indigo-500 shadow-sm">Acessar Curso</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { DashboardPage };
export default DashboardPage;
