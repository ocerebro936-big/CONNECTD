import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, Globe, Heart, MessageCircle, UserPlus } from 'lucide-react';

interface ConnectionsPageProps {
  user: any;
  profileData: any;
  toggleConnection: (platform: 'youtubeConnected' | 'instagramConnected' | 'tiktokConnected' | 'facebookConnected') => void;
}

const countries = ['Moçambique', 'Angola', 'Portugal', 'Brasil', 'Cabo Verde', 'São Tomé', 'Guiné-Bissau', 'Timor-Leste', 'Outros'];

const ConnectionsPage: React.FC<ConnectionsPageProps> = ({ user, profileData, toggleConnection }) => {
  const [subTab, setSubTab] = useState<'friendly' | 'countries'>('friendly');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-purple-500" />
          Integrações Globais
        </h2>
        <p className="text-slate-700 font-medium text-base">Expanda a sua rede além fronteiras — conexões inteligentes e descoberta global.</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-sm">
        {([
          { id: 'friendly' as const, label: '🤝 Conexão Amigável', color: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' },
          { id: 'countries' as const, label: '🌍 Amigos por Países', color: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              subTab === tab.id ? tab.color : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'friendly' && (
        <div className="space-y-6">
          <div className="border-b border-purple-200/30 pb-4">
            <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
              <Heart className="h-5 w-5 text-purple-500" />
              Procurar Conexão Amigável
            </h3>
            <p className="text-sm text-slate-600">
              O algoritmo da Connected sugere novos amigos com base nos seus interesses, publicações e visão de mundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((u) => (
              <Card key={u} className="border-purple-200/30 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl font-bold text-purple-600">
                    👤
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Criador_{u}</h4>
                    <p className="text-xs text-purple-600 font-semibold flex items-center gap-1 justify-center">
                      <Heart className="h-3 w-3" /> {95 - u * 3}% Compatibilidade
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Interesses: Tecnologia, Música, Arte</p>
                  </div>
                  <Button className="w-full rounded-xl text-xs font-bold gap-2 bg-purple-600 hover:bg-purple-500 shadow-sm" size="sm">
                    <UserPlus className="h-4 w-4" /> Conectar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {subTab === 'countries' && (
        <div className="space-y-6">
          <div className="border-b border-purple-200/30 pb-4">
            <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-500" />
              Explorar Amigos por Países
            </h3>
            <p className="text-sm text-slate-600">Filtre e conecte-se com membros da comunidade organizados por localização geográfica.</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
            {countries.map((country, idx) => (
              <button
                key={idx}
                className="px-4 py-2 bg-white/60 hover:bg-purple-100 border border-white/40 rounded-xl text-xs font-semibold text-slate-700 hover:text-purple-700 whitespace-nowrap transition-all"
              >
                {country}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {['Moçambique', 'Angola', 'Portugal', 'Brasil'].map((country, i) => (
              <Card key={i} className="border-white/30 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{['🇲🇿', '🇦🇴', '🇵🇹', '🇧🇷'][i]}</span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Comunidade {country}</h4>
                      <p className="text-xs text-slate-500">{(Math.random() * 5 + 1).toFixed(1)}k Utilizadores Ativos</p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500" onClick={() => alert(`A explorar membros de ${country}...`)}>
                    <Users className="h-3.5 w-3.5 mr-1" /> Ver Membros
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { ConnectionsPage };
export default ConnectionsPage;
