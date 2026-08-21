import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Video, X, Upload, CheckCircle2, Loader2, AlertCircle, Send, Globe, Users, Lock } from 'lucide-react';
import { connectedMedia, type MediaKind, type UploadPhase } from '../lib/connected-media';
import type { MediaMeta } from '../lib/ccs/media/metadata';

interface ConnectedMediaComposerProps {
  file: File;
  kind: string;
  user: any;
  profileData: any;
  onClose: () => void;
  onPublished?: () => void;
}

const VISIBILITY = [
  { id: 'public', label: 'Público', icon: Globe },
  { id: 'followers', label: 'Seguidores', icon: Users },
  { id: 'private', label: 'Privado', icon: Lock },
] as const;

const STEP_LABEL: Record<UploadPhase | 'done' | 'publishing' | 'published', string> = {
  verifying: 'Verificando',
  uploading: 'Enviando',
  processing: 'Preparando mídia',
  ready: 'Pronto para publicar',
  error: 'Erro',
  done: 'Concluído',
  publishing: 'Publicando',
  published: 'Publicado',
};

export function ConnectedMediaComposer({ file, kind, user, profileData, onClose, onPublished }: ConnectedMediaComposerProps) {
  const previewRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase | 'publishing' | 'published' | 'idle'>('idle');
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState<MediaMeta | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ assetId: string; url: string; kind: MediaKind; thumbnailUrl?: string | null } | null>(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');

  const isVideo = kind === 'video' || kind === 'reel';

  useEffect(() => {
    previewRef.current = URL.createObjectURL(file);
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [file]);

  useEffect(() => {
    let active = true;
    (async () => {
      setPhase('verifying');
      try {
        const r = await connectedMedia.upload(file, {
          user,
          profileData,
          visibility,
          onProgress: (f) => active && setProgress(f),
          onPhase: (p) => active && setPhase(p),
        });
        if (!active) return;
        setMeta(r.meta);
        setResult({ assetId: r.assetId, url: r.url, kind: r.kind, thumbnailUrl: r.thumbnailUrl });
        setPhase('ready');
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Falha no upload');
        setPhase('error');
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const publish = async () => {
    if (!result) return;
    setPhase('publishing');
    try {
      await connectedMedia.publish({
        assetId: result.assetId,
        url: result.url,
        kind: result.kind,
        file,
        user,
        profileData,
        content: description,
        visibility,
      });
      setPhase('published');
      onPublished?.();
    } catch (e: any) {
      setError(e?.message || 'Falha ao publicar');
      setPhase('error');
    }
  };

  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const dim = meta ? `${meta.width || '?'} × ${meta.height || '?'}` : '';
  const dur = meta?.duration ? `${Math.floor(meta.duration / 60)}:${String(Math.floor(meta.duration % 60)).padStart(2, '0')}` : '';
  const fmt = (file.type.split('/')[1] || file.name.split('.').pop() || '').toUpperCase();

  const phaseIcon = () => {
    if (phase === 'error') return <AlertCircle className="h-4 w-4 text-rose-500" />;
    if (phase === 'ready' || phase === 'published') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (phase === 'publishing') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  };

  return (
    <div className="mt-3 rounded-2xl border border-primary/30 bg-white/60 p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" /> Nova publicação
        </p>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white text-slate-500 hover:text-rose-600" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-3">
        <div className="h-32 w-32 shrink-0 rounded-xl overflow-hidden bg-black/20 border border-white/50 flex items-center justify-center">
          {isVideo ? (
            previewRef.current ? (
              <video src={previewRef.current} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <Video className="h-8 w-8 text-slate-400" />
            )
          ) : previewRef.current ? (
            <img src={previewRef.current} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
          <p className="text-xs text-slate-500 font-medium">
            {sizeMB} MB{isVideo && dur ? ` · ${dur}` : ''} {dim ? `· ${dim}` : ''} · {fmt}
          </p>
          {phase !== 'idle' && phase !== 'error' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-1">
              {phaseIcon()}
              <span>
                {phase === 'uploading'
                  ? `${STEP_LABEL.uploading} ${Math.round(progress * 100)}%`
                  : STEP_LABEL[phase as UploadPhase]}
              </span>
            </div>
          )}
          {phase === 'uploading' && (
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {phase === 'error' && (
            <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>
          )}
        </div>
      </div>

      {/* Descrição + visibilidade (apenas quando o asset está pronto) */}
      {phase === 'ready' || phase === 'published' ? (
        <div className="mt-3 space-y-3 pt-3 border-t border-slate-200/50">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Escreva uma descrição..."
            className="w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {VISIBILITY.map((v) => (
              <button
                key={v.id}
                onClick={() => setVisibility(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  visibility === v.id ? 'bg-primary text-black' : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                <v.icon className="h-3.5 w-3.5" /> {v.label}
              </button>
            ))}
            {phase === 'published' ? (
              <span className="ml-auto flex items-center gap-1 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" /> Publicado
              </span>
            ) : (
              <button
                onClick={publish}
                className="ml-auto flex items-center gap-2 rounded-xl bg-primary text-black font-bold px-5 py-2 hover:bg-primary/90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> Publicar
              </button>
            )}
          </div>
        </div>
      ) : phase === 'error' ? (
        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-white/70 text-slate-700 font-bold px-4 py-2">Fechar</button>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-400 font-medium">A publicação só é criada depois do ficheiro estar armazenado na Connected Cloud.</p>
      )}

      {phase === 'published' && (
        <div className="mt-2 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-white/70 text-slate-700 font-bold px-4 py-2">Concluído</button>
        </div>
      )}
    </div>
  );
}

export default ConnectedMediaComposer;
