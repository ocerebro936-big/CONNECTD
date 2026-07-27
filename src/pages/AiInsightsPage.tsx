import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Sparkles, TrendingUp, Users, MessageSquare } from 'lucide-react';

interface AiInsightsPageProps {
  handleComingSoon: () => void;
}

const AiInsightsPage: React.FC<AiInsightsPageProps> = ({ handleComingSoon }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">IA Insights</h2>
        <p className="text-slate-700 font-medium text-base">Análises e sugestões geradas por inteligência artificial para o seu perfil.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-primary/20 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary font-bold text-xl">
              <Sparkles className="h-6 w-6" />
              Sugestão de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 text-slate-800 font-medium">
              <strong className="text-slate-900 text-base">"Este tipo de conteúdo está a crescer"</strong><br/>
              Notamos que seus vídeos curtos sobre "Dicas de Produtividade" no TikTok e Reels tiveram um aumento de 45% no engajamento nos últimos 3 dias.
            </p>
            <div className="glass-input rounded-xl p-4 border-white/60 text-sm shadow-sm">
              <p className="font-bold text-slate-900 mb-1">Ideia de Post:</p>
              <p className="text-slate-700 font-medium">"3 Apps que mudaram minha rotina em 2026" - Formato: Vídeo de 30s com transições rápidas.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full gap-2 shadow-sm font-semibold" onClick={handleComingSoon}><MessageSquare className="h-4 w-4" /> Gerar Roteiro</Button>
          </CardFooter>
        </Card>

        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold text-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              Melhor Horário para Postar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 text-slate-800 font-medium">
              <strong className="text-slate-900 text-base">"Posta agora"</strong><br/>
              Baseado na atividade da sua audiência cruzada (YouTube + Instagram), as próximas 2 horas são o pico de engajamento da semana.
            </p>
            <div className="flex items-center justify-between glass-input rounded-xl p-4 shadow-sm">
              <div className="flex flex-col">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Hoje</span>
                <span className="font-bold text-2xl text-slate-900">18:00 - 20:00</span>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl shadow-sm">
                98%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 glass-card border-white/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-bold text-xl">
              <Users className="h-6 w-6 text-blue-600" />
              Oportunidade de Colaboração
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <p className="text-sm mb-4 text-slate-800 font-medium">
                <strong className="text-slate-900 text-base">"Colabora com essa pessoa"</strong><br/>
                Encontramos um criador com audiência 80% similar à sua, mas em um nicho complementar (Design vs Programação). Uma collab pode trazer até 5k novos seguidores para ambos.
              </p>
              <Button variant="outline" className="glass-input border-white/40 text-slate-900 hover:bg-white/50 font-semibold shadow-sm" onClick={handleComingSoon}>Ver Perfil e Enviar Convite</Button>
            </div>
            <div className="flex items-center gap-4 glass-input p-5 rounded-2xl w-full md:w-auto shadow-sm border border-white/20">
              <Avatar className="h-16 w-16 border border-white/50 shadow-sm">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Alex Costa</h4>
                <p className="text-sm text-slate-700 font-medium">150k seguidores • Design UI/UX</p>
                <div className="flex gap-1 mt-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200 px-2.5 py-0.5 text-xs font-bold transition-colors bg-emerald-100 text-emerald-700">Alta Afinidade</span>
                </div>
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
