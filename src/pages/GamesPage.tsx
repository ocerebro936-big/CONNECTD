import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Play, ExternalLink, Star, Users, X, Gamepad2, ShieldCheck, Code2, Send, Loader2 } from 'lucide-react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { playSound } from '../lib/sound-engine';

const GAME_CATEGORIES = [
  '🎲 Todos',
  '🎯 Ação',
  '🏎 Corridas',
  '⚽ Desporto',
  '🧩 Puzzle',
  '👨‍👩‍👧 Família',
  '🧠 Estratégia',
  '🎲 Cartas e Tabuleiro',
  '🌍 Multiplayer',
  '👶 Infantil',
  '🕹 Clássicos',
];

const SAFE_EMBED_DOMAINS = [
  'itch.io',
  'gamepix.com',
  'poki.com',
  'crazygames.com',
  'lagged.com',
  'y8.com',
  'miniclip.com',
  'gamedistribution.com',
  'google.com',
  'youtube.com',
  'firebaseapp.com',
  'web.app',
];

function isValidGameUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeEmbed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SAFE_EMBED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

interface GameItem {
  id: string;
  title: string;
  category: string;
  coverUrl?: string;
  description: string;
  rating: number;
  players?: number;
  url: string;
  embeddable: boolean;
  ageRating: string;
  featured?: boolean;
  status: string;
  isExternal?: boolean;
}

const GamesPage: React.FC<{ user: any; profileData: any }> = ({ user, profileData }) => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('🎲 Todos');
  const [playing, setPlaying] = useState<GameItem | null>(null);
  const [showPortal, setShowPortal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalForm, setPortalForm] = useState({
    title: '',
    url: '',
    category: '🎯 Ação',
    description: '',
    coverUrl: '',
    ageRating: 'Todos',
    embeddable: true,
  });
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'games'), (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as GameItem))
        .filter(g => g.status === 'approved');
      setGames(items);
    }, () => {});
    return () => unsub();
  }, []);

  const handleSubmitGame = async () => {
    setSubmitMsg('');
    if (!user) {
      setSubmitMsg('Inicia sessão para submeter um jogo.');
      return;
    }
    if (!portalForm.title.trim() || !portalForm.url.trim()) {
      setSubmitMsg('Título e URL são obrigatórios.');
      return;
    }
    if (!isValidGameUrl(portalForm.url)) {
      setSubmitMsg('URL inválido. Deve começar com https://');
      return;
    }
    setIsSubmitting(true);
    try {
      const embeddable = portalForm.embeddable && isSafeEmbed(portalForm.url);
      await addDoc(collection(db, 'games'), {
        title: portalForm.title.trim(),
        url: portalForm.url.trim(),
        category: portalForm.category,
        description: portalForm.description.trim() || 'Sem descrição.',
        coverUrl: portalForm.coverUrl.trim() || '',
        ageRating: portalForm.ageRating,
        embeddable,
        rating: 0,
        players: 0,
        developer: profileData.displayName || user.email?.split('@')[0] || 'Desenvolvedor',
        developerId: user.uid,
        status: 'pending',
        createdAt: Date.now(),
      });
      setSubmitMsg('✅ Jogo submetido! Aguarda aprovação da moderação da Connected.');
      setPortalForm({ ...portalForm, title: '', url: '', description: '', coverUrl: '' });
    } catch (e) {
      console.error('Error submitting game:', e);
      setSubmitMsg('Erro ao submeter. Tenta novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = activeCategory === '🎲 Todos'
    ? games
    : games.filter(g => g.category === activeCategory);

  const featured = filtered.filter(g => g.featured).slice(0, 3);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-indigo-600" /> Games Online
        </h2>
        <p className="text-slate-700 font-medium text-base">Joga gratuitamente no navegador ou explora jogos de parceiros.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 gap-2 shadow-md"
          onClick={() => setShowPortal(true)}
        >
          <Code2 className="h-4 w-4" /> Portal de Desenvolvedores
        </Button>
        <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/60 border border-white/40 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          {games.length} jogos verificados
        </span>
      </div>

      {showPortal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPortal(false)}>
          <Card className="w-full max-w-lg glass-card border-white/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-indigo-600" /> Portal de Desenvolvedores
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Submete o teu jogo. A moderação aprova antes de ser publicado. Jogos externos ficam identificados.
                  </p>
                </div>
                <button onClick={() => setShowPortal(false)} className="p-2 rounded-full hover:bg-slate-200/60 text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Título do jogo *"
                value={portalForm.title}
                onChange={(e) => setPortalForm({ ...portalForm, title: e.target.value })}
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              />
              <input
                type="url"
                placeholder="URL do jogo (https://...) *"
                value={portalForm.url}
                onChange={(e) => setPortalForm({ ...portalForm, url: e.target.value })}
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 font-mono"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={portalForm.category}
                  onChange={(e) => setPortalForm({ ...portalForm, category: e.target.value })}
                  className="glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                >
                  {GAME_CATEGORIES.filter((c) => c !== '🎲 Todos').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={portalForm.ageRating}
                  onChange={(e) => setPortalForm({ ...portalForm, ageRating: e.target.value })}
                  className="glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                >
                  <option>Todos</option>
                  <option>+7</option>
                  <option>+12</option>
                  <option>+16</option>
                  <option>+18</option>
                </select>
              </div>
              <textarea
                placeholder="Descrição curta"
                rows={2}
                value={portalForm.description}
                onChange={(e) => setPortalForm({ ...portalForm, description: e.target.value })}
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 resize-none"
              />
              <input
                type="url"
                placeholder="URL da capa (opcional)"
                value={portalForm.coverUrl}
                onChange={(e) => setPortalForm({ ...portalForm, coverUrl: e.target.value })}
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 font-mono"
              />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={portalForm.embeddable}
                  onChange={(e) => setPortalForm({ ...portalForm, embeddable: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                Permitir incorporação na Connected (apenas domínios seguros serão incorporados)
              </label>
              {submitMsg && (
                <p className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">{submitMsg}</p>
              )}
              <Button className="w-full rounded-xl font-bold gap-2" onClick={handleSubmitGame} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'A submeter...' : 'Submeter para Aprovação'}
              </Button>
              <p className="text-[10px] text-slate-400 font-medium text-center">
                {user ? `A submeter como: ${profileData.displayName || user.email}` : 'Necessitas de iniciar sessão.'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {games.length === 0 && (
        <Card className="border-white/30 shadow-md bg-white/50">
          <CardContent className="p-8 text-center">
            <Gamepad2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Ainda sem jogos publicados</h3>
            <p className="text-sm text-slate-500 mb-4">Os primeiros jogos estarão disponíveis em breve. Sê o primeiro desenvolvedor a submeter o teu jogo!</p>
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => alert('Portal de Desenvolvedores será aberto. Contacta o suporte para publicar o teu jogo.')}
            >
              🚀 Portal de Desenvolvedores
            </Button>
          </CardContent>
        </Card>
      )}

      {featured.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {featured.map(g => (
            <div key={g.id} className="relative rounded-2xl overflow-hidden shadow-lg border border-amber-300/50">
              <img src={g.coverUrl || `https://picsum.photos/seed/${g.id}/600/340`} alt={g.title} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">⭐ DESTAQUE</div>
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="text-white font-bold text-sm">{g.title}</h4>
                <p className="text-white/70 text-xs font-medium">{g.category} • ⭐ {g.rating}/100</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {GAME_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(game => {
            const safe = isValidGameUrl(game.url);
            const embeddable = game.embeddable && isSafeEmbed(game.url);
            const external = !embeddable;
            return (
            <Card key={game.id} className="border-white/30 shadow-md bg-white/60 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="relative">
                <img src={game.coverUrl || `https://picsum.photos/seed/${game.id}/600/340`} alt={game.title} className="w-full h-36 object-cover" />
                <span className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{game.category}</span>
                {external && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> EXTERNO
                  </span>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">{game.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{game.description}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-bold text-amber-600"><Star className="h-3.5 w-3.5 fill-amber-400" /> {game.rating}/100</span>
                  {game.players !== undefined && (
                    <span className="flex items-center gap-1 text-slate-500"><Users className="h-3.5 w-3.5" /> {game.players}</span>
                  )}
                  <span className="text-slate-400">{game.ageRating}</span>
                </div>
                <Button
                  className="w-full rounded-xl font-bold mt-1 bg-indigo-600 hover:bg-indigo-500 gap-2"
                  onClick={() => {
                    if (!safe) {
                      alert('⚠️ Link do jogo inválido ou indisponível. Contacta o desenvolvedor.');
                      return;
                    }
                    setPlaying(game);
                    playSound('game');
                  }}
                  disabled={!safe}
                >
                  {external ? <ExternalLink className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {external ? 'Jogar no Site Externo' : 'Jogar Agora'}
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </div>
      ) : games.length > 0 ? (
        <p className="text-center text-sm text-slate-500 py-10 font-medium">Nenhum jogo nesta categoria por enquanto.</p>
      ) : null}

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl glass-card border-white/40 shadow-2xl overflow-hidden relative rounded-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/20 bg-white/70">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{playing.title}</h3>
                <p className="text-[10px] text-slate-500">{playing.category} • {playing.ageRating}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => window.open(playing.url, '_blank', 'noopener')}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir em Nova Aba
                </Button>
                <button onClick={() => setPlaying(null)} className="p-2 rounded-full hover:bg-slate-200/60 text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="aspect-video bg-slate-900 w-full">
              {playing.embeddable && isSafeEmbed(playing.url) ? (
                <iframe src={playing.url} title={playing.title} className="w-full h-full" allow="fullscreen; autoplay; encrypted-media; gamepad" allowFullScreen />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                  <Gamepad2 className="h-12 w-12 text-white/40 mb-3" />
                  <p className="text-white font-bold mb-1 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-indigo-400" /> Jogo Externo à Connected
                  </p>
                  <p className="text-white/60 text-xs mb-4">O fornecedor exige abertura no site oficial.</p>
                  <Button className="rounded-xl font-bold" onClick={() => window.open(playing.url, '_blank', 'noopener')}>
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Jogar no Site Oficial
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { GamesPage };
export default GamesPage;
