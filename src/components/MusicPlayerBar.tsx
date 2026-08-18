import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Heart, Share2, Download, X, Music2 } from 'lucide-react';
import { MusicTrack, incrementPlays, incrementShares, incrementDownloads, toggleMusicLike, isMusicLiked } from '../lib/music';

interface MusicPlayerBarProps {
  track: MusicTrack | null;
  user: any;
  onClose: () => void;
}

const BARS = 28;

export function MusicPlayerBar({ track, user, onClose }: MusicPlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.audioUrl;
    audio.load();
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        incrementPlays(track.id).catch(() => {});
      })
      .catch(() => setIsPlaying(false));
    if (user?.uid) isMusicLiked(track.id, user.uid).then(setLiked).catch(() => setLiked(false));
    setProgress(0);
  }, [track, user?.uid]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setProgress(Number(e.target.value));
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleLike = async () => {
    if (!track || !user?.uid) return;
    const now = await toggleMusicLike(track.id, user.uid).catch(() => liked);
    setLiked(now);
  };

  const handleShare = async () => {
    if (!track) return;
    incrementShares(track.id).catch(() => {});
    const url = `${window.location.origin}/?tab=music`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${track.title} — ${track.artistName}`, text: 'Ouça na Connected Music', url });
      } catch {}
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  const handleDownload = () => {
    if (!track) return;
    incrementDownloads(track.id).catch(() => {});
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.title}.mp3`;
    a.click();
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-primary/30 px-3 py-2 shadow-2xl">
      <style>{`
        @keyframes cr-wave { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        .cr-bar { animation: cr-wave 0.9s ease-in-out infinite; transform-origin: bottom; }
      `}</style>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
          {track.cover ? (
            <img src={track.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music2 className="h-6 w-6 text-primary" />
          )}
        </div>

        <div className="w-12 shrink-0 hidden sm:flex items-end justify-center gap-[2px] h-8">
          {Array.from({ length: BARS }).map((_, i) => (
            <span
              key={i}
              className="cr-bar w-[2px] bg-primary rounded-full"
              style={{
                height: '100%',
                animationDelay: `${(i % 7) * 0.08}s`,
                opacity: isPlaying ? 1 : 0.25,
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            />
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{track.title}</p>
          <p className="text-xs text-primary/80 truncate">{track.artistName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-white/60 tabular-nums">{fmt((progress / 100) * duration)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={onSeek}
              className="flex-1 accent-primary h-1"
            />
            <span className="text-[10px] text-white/60 tabular-nums">{fmt(duration)}</span>
          </div>
        </div>

        <button onClick={togglePlay} className="h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <button onClick={handleLike} className={`p-2 rounded-full hover:bg-white/10 ${liked ? 'text-rose-400' : 'text-white/70'}`} title="Gostar">
          <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button onClick={handleShare} className="p-2 rounded-full hover:bg-white/10 text-white/70" title="Partilhar">
          <Share2 className="h-5 w-5" />
        </button>
        <button onClick={handleDownload} className="p-2 rounded-full hover:bg-white/10 text-white/70" title="Descarregar">
          <Download className="h-5 w-5" />
        </button>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70" title="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
