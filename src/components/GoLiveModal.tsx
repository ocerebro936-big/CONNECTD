import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, Radio, Camera, Settings2, Copy, Check, Loader2, History, RefreshCw } from 'lucide-react';
import { addDoc, collection, updateDoc, doc, onSnapshot, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { connectedStorage } from '../lib/cloud-storage/provider';
import {
  RTMP_SERVERS, getStreamSettings, saveStreamSettings, generateStreamKey,
  getRtmpServer, buildRtmpUrl, parseLiveLink,
} from '../lib/stream-utils';
import { compressImage } from '../lib/image-utils';

interface GoLiveModalProps {
  user: any;
  profileData: any;
  liveId: string | null;
  setLiveId: (id: string | null) => void;
  onClose: () => void;
}

const GO_LIVE_COVERS = [
  'https://picsum.photos/seed/livebg1/960/540',
  'https://picsum.photos/seed/livebg2/960/540',
  'https://picsum.photos/seed/livebg3/960/540',
  'https://picsum.photos/seed/livebg4/960/540',
];

export function GoLiveModal({ user, profileData, liveId, setLiveId, onClose }: GoLiveModalProps) {
  const [mode, setMode] = useState<'app' | 'rtmp'>('app');
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState(GO_LIVE_COVERS[0]);
  const [isLive, setIsLive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [streamSettings, setStreamSettings] = useState(getStreamSettings());
  const [copied, setCopied] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'live'>('offline');
  const [history, setHistory] = useState<any[]>([]);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [savedUrl, setSavedUrl] = useState('');
  const [liveRef, setLiveRef] = useState<string | null>(liveId);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'lives'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), firestoreLimit(6)),
      (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!liveRef) return;
    const unsub = onSnapshot(doc(db, 'lives', liveRef), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setIsLive(data.status === 'live');
    }, () => {});
    return () => unsub();
  }, [liveRef]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      console.error('Camera error:', e);
      setCameraError('Câmara indisponível. Usa o modo RTMP com OBS/Streamlabs.');
    }
  };

  const startRecording = () => {
    if (!cameraStreamRef.current) return;
    const rec = new MediaRecorder(cameraStreamRef.current);
    mediaRecorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.start();
    setRecording(true);
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const rec = mediaRecorderRef.current;
      if (!rec) return resolve(null);
      rec.onstop = () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve(blob.size > 0 ? blob : null);
      };
      rec.stop();
    });
  };

  const goLive = async () => {
    if (!user || !title.trim()) {
      alert('Dá um título à tua live.');
      return;
    }
    setIsBusy(true);
    try {
      if (mode === 'app') {
        if (!cameraStreamRef.current) {
          await startCamera();
          if (!cameraStreamRef.current) {
            setCameraError('Sem câmara — usa o modo RTMP.');
            setIsBusy(false);
            return;
          }
        }
        startRecording();
      }
      const docRef = await addDoc(collection(db, 'lives'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Criador',
        authorAvatar: profileData.photoURL || '',
        title: title.trim(),
        coverUrl: cover,
        mode,
        status: 'live',
        viewers: 0,
        streamUrl: '',
        rtmpServer: mode === 'rtmp' ? getRtmpServer(streamSettings.serverId).rtmp : '',
        streamKey: mode === 'rtmp' ? streamSettings.streamKey : '',
        createdAt: Date.now(),
      });
      setLiveRef(docRef.id);
      setLiveId(docRef.id);
      setIsLive(true);
      if (mode === 'rtmp') setStreamStatus('live');
    } catch (e) {
      console.error('Error going live:', e);
      alert('Erro ao iniciar a live.');
    } finally {
      setIsBusy(false);
    }
  };

  const endLive = async () => {
    if (!liveRef) return;
    setIsBusy(true);
    try {
      let recBlob: Blob | null = null;
      if (mode === 'app' && recording) {
        recBlob = await stopRecording();
      }
      stopCamera();

      let recordingUrl = '';
      if (recBlob) {
        try {
          const key = `lives/${liveRef}/recording.webm`;
          const res = await connectedStorage.upload(
            {
              id: key,
              ownerId: user?.uid || 'live',
              key,
              mimeType: 'video/webm',
              size: recBlob.size,
              checksum: '',
              visibility: 'public',
            },
            recBlob
          );
          recordingUrl = res.url;
        } catch (e) {
          console.error('Recording upload failed:', e);
        }
      }

      await updateDoc(doc(db, 'lives', liveRef), {
        status: 'ended',
        endedAt: Date.now(),
        recordingUrl,
      });
      setSavedUrl(recordingUrl);
      setIsLive(false);
      setStreamStatus('offline');
      setLiveId(null);
      setLiveRef(null);
    } catch (e) {
      console.error('Error ending live:', e);
    } finally {
      setIsBusy(false);
    }
  };

  const copyRtmp = async () => {
    const url = buildRtmpUrl(streamSettings.serverId, streamSettings.streamKey);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(url);
    }
  };

  const regenerateKey = () => {
    const next = { ...streamSettings, streamKey: generateStreamKey() };
    saveStreamSettings(next);
    setStreamSettings(next);
  };

  const changeServer = (serverId: string) => {
    const next = { ...streamSettings, serverId };
    saveStreamSettings(next);
    setStreamSettings(next);
  };

  const saveRecordingToTv = async () => {
    if (!liveRef || !savedUrl) return;
    try {
      await addDoc(collection(db, 'tv_queue'), {
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Criador',
        authorAvatar: profileData.photoURL || '',
        videoUrl: savedUrl,
        thumbnailUrl: cover,
        title: `📡 Live: ${title}`,
        status: 'pending',
        submittedAt: Date.now(),
      });
      alert('Gravação guardada na Connect TV!');
    } catch (e) {
      console.error('Error saving to tv:', e);
      alert('Erro ao guardar na TV.');
    }
  };

  const duration = (s: any) => {
    if (!s.createdAt) return '—';
    const ms = (s.endedAt || Date.now()) - s.createdAt;
    const mins = Math.floor(ms / 60000);
    return mins < 1 ? '<1 min' : `${mins} min`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <Card className="w-full max-w-lg glass-card border-white/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Radio className="h-5 w-5 text-rose-600" /> Ir ao Vivo
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Transmite pela aplicação ou com o teu software de streaming.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/60 text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isLive ? (
            <>
              <div className="flex gap-2 p-1 bg-white/60 rounded-xl border border-slate-200">
                {([
                  { id: 'app' as const, label: '📱 Pela Aplicação', desc: 'Câmara + microfone' },
                  { id: 'rtmp' as const, label: '💻 Software (RTMP)', desc: 'OBS, Streamlabs…' },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      mode === m.id ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {m.label}
                    <span className={`block text-[9px] font-semibold ${mode === m.id ? 'text-white/80' : 'text-slate-400'}`}>{m.desc}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Título da live *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full glass-input bg-white/60 border-white/50 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              />

              {mode === 'app' ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                    {cameraStreamRef.current || (videoRef.current && videoRef.current.srcObject) ? (
                      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                        <Camera className="h-8 w-8" />
                        <p className="text-xs font-medium">Pré-visualização da câmara</p>
                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={startCamera}>
                          Ativar Câmara
                        </Button>
                      </div>
                    )}
                    {recording && (
                      <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-rose-600/90 text-white px-2.5 py-0.5 text-[10px] font-black">
                        <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse"></span> A GRAVAR
                      </span>
                    )}
                  </div>
                  {cameraError && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{cameraError}</p>}
                  <p className="text-[10px] text-slate-400 font-medium">
                    A transmissão pela aplicação grava a sessão e permite guardá-la na Connect TV ao terminar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Servidor de Streaming</label>
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {RTMP_SERVERS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => changeServer(s.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            streamSettings.serverId === s.id
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-1.5 truncate">{getRtmpServer(streamSettings.serverId).rtmp}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Chave de Transmissão</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 bg-slate-900 text-amber-300 text-[11px] font-mono px-3 py-2 rounded-xl truncate">{streamSettings.streamKey}</code>
                      <Button size="sm" variant="outline" className="rounded-xl text-[11px]" onClick={copyRtmp}>
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copiado' : 'Copiar URL RTMP'}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl text-[11px] px-2" onClick={regenerateKey} title="Gerar nova chave">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                      Usa <span className="font-mono">{buildRtmpUrl(streamSettings.serverId, streamSettings.streamKey)}</span> no OBS / Streamlabs / XSplit.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/50 border border-slate-200 rounded-xl px-3 py-2">
                    <Settings2 className="h-4 w-4 text-slate-400" />
                    Estado da ligação:
                    <span className={`inline-flex items-center gap-1 ${streamStatus === 'live' ? 'text-rose-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${streamStatus === 'live' ? 'bg-rose-600 animate-pulse' : 'bg-slate-300'}`}></span>
                      {streamStatus === 'live' ? 'AO VIVO' : 'Sem transmissão'}
                    </span>
                  </div>
                </div>
              )}

              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">Capa da Live</label>
              <div className="flex gap-2">
                {GO_LIVE_COVERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCover(c)}
                    className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                      cover === c ? 'border-rose-600 shadow-md' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={c} alt="Capa" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <Button className="w-full rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white gap-2 shadow-md" onClick={goLive} disabled={isBusy || !title.trim()}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                {isBusy ? 'A iniciar...' : 'Iniciar Live'}
              </Button>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                <img src={cover} alt="Live" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-rose-600 text-white px-3 py-1 text-xs font-black animate-pulse">
                  🔴 AO VIVO
                </span>
                <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold truncate text-left">{title}</p>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                A tua live está no ar no feed! {mode === 'rtmp' ? 'O software ligado a este servidor está a transmitir.' : 'Gravação em curso — poderás guardá-la na Connect TV.'}
              </p>
              <Button className="w-full rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white" onClick={endLive} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Terminar Live
              </Button>
              {savedUrl && (
                <Button className="w-full rounded-xl font-bold bg-primary text-primary-foreground" onClick={saveRecordingToTv}>
                  📺 Guardar Gravação na Connect TV
                </Button>
              )}
            </div>
          )}

          {history.length > 0 && !isLive && (
            <div className="pt-2 border-t border-white/40">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-2">
                <History className="h-3 w-3" /> Histórico de transmissões
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between bg-white/50 border border-white/40 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{h.title}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                      {h.status === 'live' ? '🔴 no ar' : `${duration(h)} · ${new Date(h.createdAt).toLocaleDateString('pt-PT')}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GoLiveModal;