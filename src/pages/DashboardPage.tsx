import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Activity, TrendingUp, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlatformStatus } from '../components/PlatformStatus';

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

const DashboardPage: React.FC<DashboardPageProps> = ({ handleComingSoon }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-700 font-medium text-base">Bem-vindo de volta! Aqui está o resumo da sua vida digital.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-xl shadow-md font-semibold" onClick={handleComingSoon}>Baixar Relatório</Button>
        </div>
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
    </div>
  );
};

export { DashboardPage };
export default DashboardPage;
