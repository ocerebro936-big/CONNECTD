import React, { useState } from 'react';
import { X, Music2, Upload, Image as ImageIcon, AudioLines } from 'lucide-react';
import { Button } from './ui/button';
import { publishMusicTrack, readAudioDuration, MusicRights } from '../lib/music';
import { fileChecksum } from '../lib/cloud-storage/checksum';
import { checkQuota, formatBytes } from '../lib/cloud-storage/quota-engine';

interface MusicUploadProps {
  user: any;
  profileData: any;
  onPublished: (id: string) => void;
  onClose: () => void;
}

const GENRES = ['Pop', 'Hip-Hop', 'R&B', 'Afrobeat', 'Kizomba', 'Semba', 'Reggae', 'Eletrónica', 'Rock', 'Jazz', 'Gospel', 'Outro'];

export function MusicUpload({ user, profileData, onPublished, onClose }: MusicUploadProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Outro');
  const [description, setDescription] = useState('');
  const [rights, setRights] = useState<MusicRights>('original');
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const onAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAudioFile(f);
    setDuration(await readAudioDuration(f));
  };

  const handlePublish = async () => {
    setError('');
    if (!audioFile) return setError('Seleciona um ficheiro de áudio.');
    if (!title.trim()) return setError('Indica o título da música.');
    setUploading(true);
    try {
      const addBytes = audioFile.size + (coverFile?.size || 0);
      const quota = await checkQuota(user.uid, addBytes, user, profileData);
      if (!quota.ok) {
        return setError(
          `Quota esgotada (${quota.tier}): usado ${formatBytes(quota.used)} de ${formatBytes(quota.limit)}.`
        );
      }
      const checksum = await fileChecksum(audioFile);
      const coverChecksum = coverFile ? await fileChecksum(coverFile) : undefined;
      const id = await publishMusicTrack({
        artistId: user.uid,
        artistName: profileData?.displayName || user.email?.split('@')[0] || 'Artista',
        artistAvatar: profileData?.photoURL,
        title: title.trim(),
        audioFile,
        coverFile: coverFile || undefined,
        genre,
        description: description.trim(),
        rights,
        duration,
        checksum,
        coverChecksum,
        onProgress: (label, pct) => setProgress(`${label}: ${Math.round(pct)}%`),
      });
      onPublished(id);
    } catch (err: any) {
      setError('Erro ao publicar: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/40">
        <div className="flex items-center justify-between p-4 border-b border-white/30">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" /> Publicar Música
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Áudio */}
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Ficheiro de áudio *</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-white/60 px-4 py-3 text-sm font-semibold text-primary hover:bg-white">
                <AudioLines className="h-4 w-4" /> Selecionar áudio
                <input type="file" accept="audio/*" className="hidden" onChange={onAudioChange} />
              </label>
              {audioFile && <span className="text-xs text-slate-600 truncate">{audioFile.name}</span>}
            </div>
          </label>

          {/* Capa */}
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Capa (opcional)</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-white/60 px-4 py-3 text-sm font-semibold text-primary hover:bg-white">
                <ImageIcon className="h-4 w-4" /> Selecionar capa
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </label>
              {coverFile && <span className="text-xs text-slate-600 truncate">{coverFile.name}</span>}
            </div>
          </label>

          <div>
            <label className="text-sm font-semibold text-slate-700">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Nome da música"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Género</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1 w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Direitos</label>
              <select
                value={rights}
                onChange={(e) => setRights(e.target.value as MusicRights)}
                className="mt-1 w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                <option value="original">Original (eu criei)</option>
                <option value="authorized">Autorizada</option>
                <option value="cover">Cover</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full glass-input bg-white/70 border-white/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Sobre esta música…"
            />
          </div>

          {duration > 0 && (
            <p className="text-xs text-slate-500">Duração detectada: {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</p>
          )}

          {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}

          <Button
            onClick={handlePublish}
            disabled={uploading}
            className="w-full rounded-xl bg-primary text-black font-bold hover:bg-primary/90"
          >
            {uploading ? (
              <>A publicar…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Publicar Música</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
