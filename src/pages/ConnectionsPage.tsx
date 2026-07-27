import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Youtube, Instagram, Facebook } from 'lucide-react';

interface ConnectionsPageProps {
  user: any;
  profileData: any;
  toggleConnection: (platform: 'youtubeConnected' | 'instagramConnected' | 'tiktokConnected' | 'facebookConnected') => void;
}

const ConnectionsPage: React.FC<ConnectionsPageProps> = ({ user, profileData, toggleConnection }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Integrações</h2>
        <p className="text-slate-700 font-medium text-base">Conecte suas redes sociais para sincronizar dados e insights.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${profileData.youtubeConnected ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
              <Youtube className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">YouTube</CardTitle>
              <CardDescription className={profileData.youtubeConnected ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>
                {profileData.youtubeConnected ? 'Conectado' : 'Não conectado'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 font-medium mb-4">Sincronizando vídeos, shorts, visualizações e inscritos.</p>
            <Button
              variant={profileData.youtubeConnected ? "outline" : "default"}
              className={`w-full ${profileData.youtubeConnected ? 'glass-input border-white/60 text-slate-900 hover:bg-white/50' : 'shadow-md'}`}
              onClick={() => toggleConnection('youtubeConnected')}
            >
              {profileData.youtubeConnected ? 'Desconectar' : 'Conectar Conta'}
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${profileData.instagramConnected ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
              <Instagram className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Instagram</CardTitle>
              <CardDescription className={profileData.instagramConnected ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>
                {profileData.instagramConnected ? 'Conectado' : 'Não conectado'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 font-medium mb-4">Sincronizando posts, reels, stories e seguidores.</p>
            <Button
              variant={profileData.instagramConnected ? "outline" : "default"}
              className={`w-full ${profileData.instagramConnected ? 'glass-input border-white/60 text-slate-900 hover:bg-white/50' : 'shadow-md'}`}
              onClick={() => toggleConnection('instagramConnected')}
            >
              {profileData.instagramConnected ? 'Desconectar' : 'Conectar Conta'}
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${profileData.tiktokConnected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">TikTok</CardTitle>
              <CardDescription className={profileData.tiktokConnected ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>
                {profileData.tiktokConnected ? 'Conectado' : 'Não conectado'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 font-medium mb-4">Sincronizando vídeos curtos e engajamento.</p>
            <Button
              variant={profileData.tiktokConnected ? "outline" : "default"}
              className={`w-full ${profileData.tiktokConnected ? 'glass-input border-white/60 text-slate-900 hover:bg-white/50' : 'shadow-md'}`}
              onClick={() => toggleConnection('tiktokConnected')}
            >
              {profileData.tiktokConnected ? 'Desconectar' : 'Conectar Conta'}
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/30 shadow-md">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${profileData.facebookConnected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
              <Facebook className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Facebook</CardTitle>
              <CardDescription className={profileData.facebookConnected ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>
                {profileData.facebookConnected ? 'Conectado' : 'Não conectado'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 font-medium mb-4">Conecte para sincronizar páginas e grupos.</p>
            <Button
              variant={profileData.facebookConnected ? "outline" : "default"}
              className={`w-full ${profileData.facebookConnected ? 'glass-input border-white/60 text-slate-900 hover:bg-white/50' : 'shadow-md'}`}
              onClick={() => toggleConnection('facebookConnected')}
            >
              {profileData.facebookConnected ? 'Desconectar' : 'Conectar Conta'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { ConnectionsPage };
export default ConnectionsPage;
