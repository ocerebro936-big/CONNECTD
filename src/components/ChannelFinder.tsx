import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Play, Search, Tv, CheckCircle2, AlertTriangle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import {
  seedIntegratedChannels,
  listTvChannels,
  addChannelFromFinder,
  listPendingChannels,
  setChannelStatus,
  type ChannelDoc,
} from '../lib/connect-tv';
import {
  validateChannelSource,
  type ChannelValidationResult,
  type ChannelCategory,
} from '../lib/channel-finder';

const CATEGORIES: ChannelCategory[] = [
  '🎬 Filmes',
  '🎵 Música',
  '📚 Educação',
  '📰 Notícias',
  '⚽ Desporto',
  '🌍 Cultura',
  '🎥 Filmes autorizados',
  '🔴 Lives',
  '🎙 Podcasts',
  '📽 Documentários',
  '📺 Geral',
];

const formatViews = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

interface ChannelFinderProps {
  user: any;
  profileData: any;
}

const ChannelFinder: React.FC<ChannelFinderProps> = ({ user, profileData }) => {
  const isModerator =
    profileData?.role === 'admin' || user?.email === 'ocerebro936@gmail.com';

  const [channels, setChannels] = useState<ChannelDoc[]>([]);
  const [pending, setPending] = useState<ChannelDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [finderUrl, setFinderUrl] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ChannelValidationResult | null>(null);
  const [finderTitle, setFinderTitle] = useState('');
  const [finderCategory, setFinderCategory] = useState<ChannelCategory>('📺 Geral');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const [selected, setSelected] = useState<ChannelDoc | null>(null);
  const [activeCat, setActiveCat] = useState<string>('Todos');

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    const list = await listTvChannels(user.uid, isModerator);
    setChannels(list);
    if (isModerator) setPending(await listPendingChannels());
  }, [user?.uid, isModerator]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await seedIntegratedChannels();
        if (active) await refresh();
      } catch (e) {
        console.error('Erro ao carregar canais:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const runValidation = async () => {
    if (!finderUrl.trim()) return;
    setValidating(true);
    setValidation(null);
    setMsg(null);
    try {
      const result = await validateChannelSource(finderUrl);
      setValidation(result);
      setFinderTitle(result.domain ? result.domain : '');
      setFinderCategory(result.suggestedCategory);
    } catch (e) {
      setMsg({ kind: 'err', text: 'Falha ao validar a fonte.' });
    } finally {
      setValidating(false);
    }
  };

  const submitChannel = async () => {
    if (!validation || !user) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await addChannelFromFinder({
        url: validation.normalized,
        title: finderTitle,
        category: finderCategory,
        validation,
        user: {
          uid: user.uid,
          displayName: profileData?.displayName,
          email: user.email,
        },
      });
      await refresh();
      setFinderUrl('');
      setValidation(null);
      setFinderTitle('');
      setMsg(
        validation.authorized
          ? { kind: 'ok', text: 'Canal autorizado adicionado ao catálogo!' }
          : { kind: 'warn', text: 'Fonte enviada para autorização da moderação (não retransmitimos sem autorização).' }
      );
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || 'Erro ao adicionar o canal.' });
    } finally {
      setSubmitting(false);
    }
  };

  const stepIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (status === 'fail') return <XCircle className="h-4 w-4 text-rose-500" />;
    return <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />;
  };

  const cats = ['Todos', ...Array.from(new Set(channels.map((c) => c.category)))];
  const visible =
    activeCat === 'Todos' ? channels : channels.filter((c) => c.category === activeCat);

  const renderPlayer = (ch: ChannelDoc) => {
    const isEmbed = /youtube|youtu\.be|vimeo|twitch|dailymotion/.test(ch.url);
    if (isEmbed) {
      return (
        <iframe
          src={ch.url}
          className="absolute inset-0 w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return <video src={ch.url} controls autoPlay className="absolute inset-0 w-full h-full bg-black" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel Finder */}
        <Card className="glass-card border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-900 text-xl font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Connected Channel Finder
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Descobre fontes públicas e autorizadas. Validamos URL → acesso → autorização → categoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://exemplo.com/canal ou stream.m3u8"
                className="flex-1 glass-input bg-white/50 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={finderUrl}
                onChange={(e) => setFinderUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runValidation()}
              />
              <Button onClick={runValidation} disabled={validating || !finderUrl.trim()} className="rounded-xl px-4">
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {validation && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/40 bg-white/40 p-3 space-y-2">
                  {validation.steps.map((s) => (
                    <div key={s.key} className="flex items-start gap-2 text-sm">
                      {stepIcon(s.status)}
                      <div>
                        <p className="font-bold text-slate-800">{s.label}</p>
                        <p className="text-slate-500 font-medium">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {validation.valid && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase">Título</label>
                      <input
                        type="text"
                        className="w-full glass-input bg-white/50 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={finderTitle}
                        onChange={(e) => setFinderTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase">Categoria</label>
                      <select
                        className="w-full glass-input bg-white/50 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                        value={finderCategory}
                        onChange={(e) => setFinderCategory(e.target.value as ChannelCategory)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {validation.requiresModeration && !isModerator && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-300/40 rounded-lg p-2">
                        <ShieldCheck className="h-4 w-4" /> Esta fonte requer autorização da moderação antes de aparecer no catálogo.
                      </div>
                    )}
                    <Button onClick={submitChannel} disabled={submitting} className="w-full rounded-xl">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tv className="h-4 w-4 mr-1" />}
                      Adicionar à Connect TV
                    </Button>
                  </div>
                )}
              </div>
            )}

            {msg && (
              <div
                className={`text-sm font-semibold rounded-xl p-3 border ${
                  msg.kind === 'ok'
                    ? 'text-emerald-700 bg-emerald-500/10 border-emerald-300/40'
                    : msg.kind === 'warn'
                    ? 'text-amber-700 bg-amber-500/10 border-amber-300/40'
                    : 'text-rose-700 bg-rose-500/10 border-rose-300/40'
                }`}
              >
                {msg.text}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Catálogo */}
        <Card className="glass-card border-white/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-900 text-xl font-bold flex items-center gap-2">
              <Tv className="h-5 w-5 text-primary" /> Catálogo Connect TV
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Canais integrados + fontes externas autorizadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {cats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeCat === c
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/50 text-slate-700 border border-white/50 hover:bg-white/80'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 max-h-[480px] overflow-y-auto pr-1">
              {visible.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-xl overflow-hidden border border-white/40 bg-white/50 shadow-sm cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => setSelected(ch)}
                >
                  <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                    <img
                      src={ch.thumbnail}
                      alt={ch.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(ch.title)}/600/400`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-primary/90 text-white rounded-full p-2.5 shadow-xl">
                        <Play className="h-5 w-5" />
                      </span>
                    </div>
                    {ch.status === 'pending' && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-amber-500/90 text-white px-2 py-0.5 rounded-md">
                        Pendente
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{ch.title}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate">{ch.creator} · {ch.category}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white/60 rounded-full px-2 py-0.5">
                        👁 {formatViews(ch.views)} viz.
                      </span>
                      {ch.rating > 0 && (
                        <span className="text-[11px] font-black text-amber-600">⭐ {ch.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moderação */}
      {isModerator && pending.length > 0 && (
        <Card className="glass-card border-amber-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" /> Moderação — Fontes pendentes ({pending.length})
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              Aprova apenas fontes com autorização de transmissão/redistribuição.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between gap-3 p-3 bg-white/40 rounded-xl border border-white/30">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{ch.title}</p>
                  <p className="text-xs text-slate-500 font-medium truncate">{ch.url}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="rounded-lg text-emerald-700 border-emerald-300" onClick={async () => { await setChannelStatus(ch.id!, 'authorized', user.uid); await refresh(); }}>
                    Autorizar
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-rose-700 border-rose-300" onClick={async () => { await setChannelStatus(ch.id!, 'rejected', user.uid); await refresh(); }}>
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player modal */}
      {selected && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelected(null)}>
          <div className="w-full max-w-3xl glass-card border-white/30 overflow-hidden rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-video bg-black">{renderPlayer(selected)}</div>
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{selected.title}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selected.creator} · {selected.category} · 👁 {formatViews(selected.views)} visualizações
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="rounded-xl" title="Fechar">
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelFinder;
