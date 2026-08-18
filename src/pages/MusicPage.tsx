import React, { useEffect, useState, useCallback } from 'react';
import { Music2, Plus, Play, Pause } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { MusicPlayerBar } from '../components/MusicPlayerBar';
import { MusicUpload } from '../components/MusicUpload';
import { listMusicTracks, listMusicByArtist, MusicTrack, isMusicLiked } from '../lib/music';
import { setPageMeta, injectJsonLd, removeJsonLd, musicRecordingSchema } from '../lib/seo';
import { seedDemoMusic } from '../lib/seed';

interface MusicPageProps {
  user: any;
  profileData: any;
  allUsers: any[];
  onOpenProfile: (uid: string) => void;
}

export function MusicPage({ user, profileData, allUsers, onOpenProfile }: MusicPageProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    setPageMeta('Connected Music — Rede Social Connected', 'Publica e ouve música na Connected Music. Artistas independentes, álbuns e playlists.');
  }, []);

  useEffect(() => {
    if (currentTrack) {
      injectJsonLd('ld-music', musicRecordingSchema(currentTrack));
    } else {
      removeJsonLd('ld-music');
    }
  }, [currentTrack]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        filter === 'mine' && user?.uid
          ? await listMusicByArtist(user.uid)
          : await listMusicTracks(60);
      setTracks(data);
    } catch (e) {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [filter, user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSeed = useCallback(async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDemoMusic(user, profileData?.displayName || user.email || 'Artista');
      setFilter('all');
      await load();
    } catch (err: any) {
      console.error('Erro ao carregar música de exemplo:', err);
      alert('Não foi possível carregar a música de exemplo. Verifica se o Connected Storage (Firebase Storage) está ativo no console ou se o backend S3/MEGA está configurado.');
    } finally {
      setSeeding(false);
    }
  }, [user, profileData, load]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Music2 className="h-8 w-8 text-primary" /> Connected Music
          </h1>
          <p className="text-slate-600 font-medium">
            Publica a tua música e deixa o DIVINO e a comunidade descobrirem-na.
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSeed} variant="outline" disabled={seeding} className="rounded-xl font-bold border-primary/40 text-primary hover:bg-primary/10">
              {seeding ? 'A carregar...' : 'Carregar exemplo'}
            </Button>
            <Button onClick={() => setShowUpload(true)} className="rounded-xl bg-primary text-black font-bold hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Publicar música
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'mine'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
              filter === f ? 'bg-primary text-black' : 'bg-white/60 text-slate-700 hover:bg-white'
            }`}
          >
            {f === 'all' ? 'Tudo' : 'As minhas'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-12">A carregar músicas…</p>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-white/30">
          <Music2 className="h-12 w-12 text-primary/50 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Ainda não há músicas aqui.</p>
          {user && (
            <Button onClick={() => setShowUpload(true)} className="mt-4 rounded-xl bg-primary text-black font-bold">
              <Plus className="h-4 w-4 mr-2" /> Publica a primeira
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tracks.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl border border-white/30 shadow-lg overflow-hidden hover:shadow-xl transition-all">
              <div className="relative aspect-square bg-black/30">
                {t.cover ? (
                  <img src={t.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Music2 className="h-12 w-12 text-primary/50" />
                  </div>
                )}
                <button
                  onClick={() => setCurrentTrack(t)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="h-12 w-12 rounded-full bg-primary text-black flex items-center justify-center">
                    {currentTrack?.id === t.id ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </span>
                </button>
              </div>
              <div className="p-3 space-y-1">
                <p className="font-bold text-slate-900 text-sm truncate">{t.title}</p>
                <button onClick={() => onOpenProfile(t.artistId)} className="flex items-center gap-2 w-full text-left">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={t.artistAvatar} />
                    <AvatarFallback className="text-[9px]">{t.artistName?.[0] || 'A'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-slate-600 truncate">{t.artistName}</span>
                </button>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>▶ {t.plays}</span>
                  <span>♡ {t.likes}</span>
                  {t.genre && <span className="ml-auto bg-primary/10 text-primary px-1.5 rounded">{t.genre}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <MusicUpload
          user={user}
          profileData={profileData}
          onPublished={(id) => {
            setShowUpload(false);
            setFilter('mine');
            load();
            const t = tracks.find((x) => x.id === id);
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      <MusicPlayerBar track={currentTrack} user={user} onClose={() => setCurrentTrack(null)} />
    </div>
  );
}
