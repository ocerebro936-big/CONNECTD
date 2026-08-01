import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Sparkles, TrendingUp, Users, MessageSquare, Activity, MessageCircle, Heart } from 'lucide-react';

interface AiInsightsPageProps {
  user: any;
  allUsers: any[];
  posts: any[];
  messages: any[];
}

const AiInsightsPage: React.FC<AiInsightsPageProps> = ({ user, allUsers, posts, messages }) => {
  const totalUsers = allUsers.length;
  const totalPosts = posts.length;
  const totalMessages = messages.length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const topUsers = [...allUsers]
    .filter(u => u.uid !== user?.uid)
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">IA Insights</h2>
        <p className="text-slate-700 font-medium text-base">Analises em tempo real baseadas na atividade da plataforma Connected.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-primary/20 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold text-xl">
              <Activity className="h-6 w-6" />
              Metricas da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-input rounded-xl p-4 border-white/60 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Users className="h-4 w-4" /> Utilizadores
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
              </div>
              <div className="glass-input rounded-xl p-4 border-white/60 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <MessageSquare className="h-4 w-4" /> Publicacoes
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalPosts}</p>
              </div>
              <div className="glass-input rounded-xl p-4 border-white/60 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <MessageCircle className="h-4 w-4" /> Mensagens
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalMessages}</p>
              </div>
              <div className="glass-input rounded-xl p-4 border-white/60 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Heart className="h-4 w-4" /> Likes Totais
                </div>
                <p className="text-2xl font-bold text-slate-900">{totalLikes}</p>
              </div>
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
              Utilizadores com maior pontuacao na plataforma
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
              <p className="text-sm text-slate-500 text-center py-4">Ainda nao ha membros na plataforma.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold text-xl">
              <Users className="h-6 w-6 text-blue-600" />
              Visao Geral da Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-input rounded-xl p-4 shadow-sm border border-white/20 text-center">
                <p className="text-3xl font-black text-primary">{totalUsers}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">Membros Registados</p>
              </div>
              <div className="glass-input rounded-xl p-4 shadow-sm border border-white/20 text-center">
                <p className="text-3xl font-black text-emerald-600">{totalPosts}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">Publicacoes Criadas</p>
              </div>
              <div className="glass-input rounded-xl p-4 shadow-sm border border-white/20 text-center">
                <p className="text-3xl font-black text-amber-600">{totalMessages}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">Mensagens Trocadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AiInsightsPage };
export default AiInsightsPage;