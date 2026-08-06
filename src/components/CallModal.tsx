import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'webrtc-adapter';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Award, Loader2 } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserLevelBadge } from './UserLevelBadge';
import { PartyTracks, getMic, getCamera, createAudioSink } from 'partytracks/client';
import { BehaviorSubject, Subscription } from 'rxjs';
import { createPartyTracks } from '../lib/calls-api';

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
];

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallModalProps {
  user: any;
  targetUser: any;
  onClose: () => void;
  role?: 'caller' | 'callee';
  incomingCallId?: string;
  initialType?: 'voice' | 'video';
}

type TrackMeta = { trackName: string; sessionId: string; location: 'remote' };

export function CallModal({ user, targetUser, onClose, role = 'caller', incomingCallId, initialType }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>(role === 'callee' ? 'ringing' : 'idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>(initialType || 'video');
  const [isVideoOn, setIsVideoOn] = useState((initialType || 'video') === 'video');
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [userPoints, setUserPoints] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(role === 'callee' ? incomingCallId || null : null);
  const addedCandidatesRef = useRef<Set<string>>(new Set());
  const endedRef = useRef(false);
  const meetingModeRef = useRef<'cloud' | 'p2p' | null>(null);

  // Cloud (PartyTracks / SFU Cloudflare)
  const ptRef = useRef<PartyTracks | null>(null);
  const micRef = useRef<any>(null);
  const camRef = useRef<any>(null);
  const subsRef = useRef<Subscription[]>([]);
  const audioSinkRef = useRef<ReturnType<typeof createAudioSink> | null>(null);
  const remoteAudioMetaRef = useRef(new BehaviorSubject<TrackMeta | null>(null));
  const remoteVideoMetaRef = useRef(new BehaviorSubject<TrackMeta | null>(null));
  const cloudStartedRef = useRef(false);

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserPoints(snap.data().points || 0);
      });
    }
  }, [user]);

  const stopAllTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  const teardownCloud = () => {
    cloudStartedRef.current = false;
    subsRef.current.forEach((s) => s.unsubscribe());
    subsRef.current = [];
    audioSinkRef.current = null;
    try {
      micRef.current?.disableSource?.();
      camRef.current?.disableSource?.();
    } catch {
      /* noop */
    }
    micRef.current = null;
    camRef.current = null;
    ptRef.current = null;
    remoteAudioMetaRef.current.next(null);
    remoteVideoMetaRef.current.next(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      stopAllTracks();
      teardownCloud();
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((sec) => {
        const next = sec + 1;
        if (next % 60 === 0 && role === 'caller') {
          updateDoc(doc(db, 'users', user.uid), { points: increment(-10) }).catch(() => {});
          setUserPoints((p) => Math.max(0, p - 10));
        }
        return next;
      });
    }, 1000);
  }, [role, user]);

  const handleAnswered = useCallback(async (callId: string, answer: any) => {
    if (!pcRef.current) return;
    setCallStatus('connected');
    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      console.error('Answer error:', e);
    }
    startTimer();
  }, [startTimer]);

  // Cloud: cria PartyTracks, publica mic/camera e puxa as tracks do outro lado
  const connectCloudCall = useCallback(async (withVideo: boolean, callId: string) => {
    if (cloudStartedRef.current) return;
    const pt = await createPartyTracks({ callId, uid: user.uid });
    if (!pt) throw new Error('Serviço de chamadas Cloud indisponível.');
    ptRef.current = pt;
    meetingModeRef.current = 'cloud';

    const mic = getMic({ broadcasting: true, activateSource: true });
    micRef.current = mic;
    const cam = getCamera({ broadcasting: withVideo, activateSource: withVideo });
    camRef.current = cam;

    const publishMeta = (kind: 'audio' | 'video', meta: any) => {
      if (!callIdRef.current || !meta?.trackName || !meta?.sessionId) return;
      updateDoc(doc(db, 'calls', callIdRef.current), {
        [`cloudMeta.${user.uid}.${kind}`]: { trackName: meta.trackName, sessionId: meta.sessionId },
      }).catch(() => {});
    };

    subsRef.current.push(
      pt.push(mic.broadcastTrack$).subscribe((meta: any) => publishMeta('audio', meta)),
    );
    if (withVideo) {
      cam.broadcastTrack$.subscribe((track: MediaStreamTrack) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = new MediaStream([track]);
      });
      subsRef.current.push(
        pt.push(cam.broadcastTrack$).subscribe((meta: any) => publishMeta('video', meta)),
      );
    }

    // Remoto: áudio/vídeo vindos do peer
    const remoteAudio$ = pt.pull(remoteAudioMetaRef.current as any);
    const remoteVideo$ = pt.pull(remoteVideoMetaRef.current as any);

    subsRef.current.push(
      remoteVideo$.subscribe((track: MediaStreamTrack) => {
        if (!remoteVideoMetaRef.current.getValue()) return;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = new MediaStream([track]);
      }),
    );

    const sink = createAudioSink({ audioElement: audioElRef.current as HTMLAudioElement });
    audioSinkRef.current = sink;
    subsRef.current.push(sink.attach(remoteAudio$) as any);

    cloudStartedRef.current = true;
  }, [user]);

  // Publica o cloudMeta assim que o outro lado publica tracks (áudio/vídeo remotos)
  useEffect(() => {
    if (!callIdRef.current) return;
    const unsub = onSnapshot(doc(db, 'calls', callIdRef.current), (snap) => {
      const data = snap.data();
      if (!data) return;
      const otherUid = user.uid === data.callerId ? data.receiverId : data.callerId;
      const peer = data?.cloudMeta?.[otherUid];
      if (!peer) return;
      if (peer.audio?.trackName && peer.audio?.sessionId) {
        remoteAudioMetaRef.current.next({
          trackName: peer.audio.trackName,
          sessionId: peer.audio.sessionId,
          location: 'remote',
        });
      }
      if (peer.video?.trackName && peer.video?.sessionId) {
        remoteVideoMetaRef.current.next({
          trackName: peer.video.trackName,
          sessionId: peer.video.sessionId,
          location: 'remote',
        });
      }
    }, () => {});
    return () => unsub();
  }, [user.uid, callIdRef.current]);

  const applyMediaState = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    streamRef.current.getVideoTracks().forEach((t) => { t.enabled = isVideoOn; });
  };

  useEffect(() => { applyMediaState(); }, [isMuted, isVideoOn]);

  const startLocalStream = async (withVideo: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      throw new Error('Permissão de câmara/microfone negada.');
    }
  };

  const listenForIceCandidates = useCallback((callId: string) => {
    const q = query(collection(db, 'calls', callId, 'ice'));
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        const key = change.doc.id;
        if (!pcRef.current || addedCandidatesRef.current.has(key)) return;
        addedCandidatesRef.current.add(key);
        try {
          pcRef.current.addIceCandidate(data as RTCIceCandidateInit).catch(() => {});
        } catch {
          /* ignore invalid candidates */
        }
      });
    }, () => {});
  }, []);

  const createPeerConnection = (stream: MediaStream, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && callId) {
        addDoc(collection(db, 'calls', callId, 'ice'), e.candidate.toJSON()).catch(() => {});
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    listenForIceCandidates(callId);
    return pc;
  };

  // Caller: listen for answer/end
  useEffect(() => {
    if (role !== 'caller' || callStatus !== 'ringing' || !callIdRef.current) return;
    const unsub = onSnapshot(doc(db, 'calls', callIdRef.current), (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.status === 'answered' && callStatus === 'ringing') {
        if (meetingModeRef.current === 'cloud' && cloudStartedRef.current) {
          setCallStatus('connected');
          startTimer();
        } else if (data.answer) {
          handleAnswered(callIdRef.current as string, data.answer);
        }
      }
      if ((data.status === 'ended' || data.status === 'declined') && callStatus !== 'ended') {
        endCall(data.status === 'declined' ? 'Chamada recusada.' : '');
      }
    }, () => {});
    return () => unsub();
  }, [role, callStatus]);

  // Callee: listen for call end, answer only on button press
  useEffect(() => {
    if (role !== 'callee' || !callIdRef.current) return;
    const unsub = onSnapshot(doc(db, 'calls', callIdRef.current), (snap) => {
      const data = snap.data();
      if (!data) return;
      if ((data.status === 'ended' || data.status === 'declined') && callStatus !== 'ended' && !endedRef.current) {
        endCall(data.status === 'declined' ? 'Chamada terminou.' : '');
      }
    }, () => {});
    return () => unsub();
  }, [role, callStatus]);

  const startCloudCall = useCallback(async (withVideo: boolean, callId: string) => {
    if (cloudStartedRef.current) return;
    await connectCloudCall(withVideo, callId);
    cloudStartedRef.current = true;
  }, [connectCloudCall]);

  const acceptCall = async () => {
    if (!callIdRef.current || callStatus !== 'ringing' || !user) return;
    try {
      const callSnap = await getDoc(doc(db, 'calls', callIdRef.current));
      if (!callSnap.exists()) return;
      const callData = callSnap.data();
      if (callData.status !== 'ringing') {
        endCall('Chamada terminou.');
        return;
      }
      try {
        await startCloudCall(isVideoOn, callIdRef.current);
        await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'answered' });
        setCallStatus('connected');
        startTimer();
        return;
      } catch {
        if (callData.mode === 'cloud') {
          setError('Falha na ligação Cloud. Tenta novamente.');
          updateDoc(doc(db, 'calls', callIdRef.current), { status: 'declined' }).catch(() => {});
          return;
        }
      }
      const stream = await startLocalStream(isVideoOn);
      const pc = createPeerConnection(stream, callIdRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(doc(db, 'calls', callIdRef.current), {
        status: 'answered',
        answer: { type: answer.type, sdp: answer.sdp },
      });
      setCallStatus('connected');
      startTimer();
    } catch (e: any) {
      setError(e.message || 'Erro ao atender.');
      updateDoc(doc(db, 'calls', callIdRef.current), { status: 'declined' }).catch(() => {});
    }
  };

  const startCall = async () => {
    setError('');
    if (userPoints < 10) {
      setError('Pontos insuficientes! Publica conteúdos úteis para ganhar saldo.');
      return;
    }
    setCallStatus('calling');
    try {
      const withVideo = callType === 'video';
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: user.uid,
        callerName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        callerAvatar: user.photoURL || '',
        receiverId: targetUser.id,
        type: callType,
        status: 'ringing',
        createdAt: Date.now(),
        durationSeconds: 0,
      });
      callIdRef.current = callRef.id;
      let cloudOk = false;
      try {
        await startCloudCall(withVideo, callRef.id);
        cloudOk = true;
      } catch {
        cloudOk = false;
      }
      if (cloudOk) {
        await updateDoc(doc(db, 'calls', callRef.id), { mode: 'cloud' });
        setCallStatus('ringing');
      } else {
        meetingModeRef.current = 'p2p';
        const stream = await startLocalStream(withVideo);
        const pc = createPeerConnection(stream, callRef.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await updateDoc(doc(db, 'calls', callRef.id), {
          offer: { type: offer.type, sdp: offer.sdp },
          mode: 'p2p',
        });
        setCallStatus('ringing');
      }
      await updateDoc(doc(db, 'users', user.uid), { points: increment(-10) });
      setUserPoints((p) => Math.max(0, p - 10));
    } catch (e: any) {
      setError(e.message || 'Erro ao iniciar chamada.');
      setCallStatus('idle');
    }
  };

  const declineCall = async () => {
    if (callIdRef.current && role === 'callee') {
      await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'declined' }).catch(() => {});
    }
    endCall();
  };

  const endCall = (msg = '') => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    pcRef.current?.close();
    stopAllTracks();
    teardownCloud();
    setCallStatus('ended');
    if (msg) setError(msg);
    if (callIdRef.current) {
      updateDoc(doc(db, 'calls', callIdRef.current), {
        status: 'ended',
        durationSeconds: callDuration,
      }).catch(() => {});
    }
    setTimeout(onClose, 2000);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl overflow-hidden">
        <audio ref={audioElRef} autoPlay playsInline className="hidden" />
        <CardHeader className="bg-slate-800/80 flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarImage src={targetUser.photoURL || 'https://github.com/shadcn.png'} />
              <AvatarFallback>{targetUser.displayName?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-white text-base font-bold">{targetUser.displayName || 'Utilizador'}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  {callStatus === 'connected' ? formatDuration(callDuration) : callStatus === 'ringing' ? 'A tocar...' : callStatus === 'calling' ? 'A conectar...' : ''}
                </span>
                <UserLevelBadge points={userPoints} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
            <Award className="h-3 w-3" /> {userPoints}pts
          </div>
        </CardHeader>

        <CardContent className="p-0 relative bg-black">
          <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
            {callStatus === 'connected' ? (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className={`${callType === 'video' ? 'w-full h-full object-cover' : 'hidden'} absolute inset-0`} />
                {callType === 'voice' && (
                  <div className="text-center text-slate-400">
                    <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-white/20">
                      <AvatarImage src={targetUser.photoURL || 'https://github.com/shadcn.png'} />
                      <AvatarFallback className="text-4xl">{targetUser.displayName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">Chamada de voz em curso…</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-slate-500">
                <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-white/20">
                  <AvatarImage src={targetUser.photoURL || 'https://github.com/shadcn.png'} />
                  <AvatarFallback className="text-4xl">{targetUser.displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">
                  {callStatus === 'ringing' && role === 'callee' ? 'Chamada recebida...' : callStatus === 'ringing' ? 'A tocar...' : 'A estabelecer ligação...'}
                </p>
              </div>
            )}

            {callStatus === 'connected' && callType === 'video' && (
              <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-slate-800 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-500/20 border-t border-rose-500/30 text-rose-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 p-6 bg-slate-800/50">
            {callStatus === 'idle' && role === 'caller' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => { setCallType('voice'); setCallStatus('idle'); setTimeout(startCall, 50); }}
                  variant="outline"
                  className="rounded-2xl h-14 px-5 bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-2"
                >
                  <Phone className="h-5 w-5" /> Chamada de Voz
                </Button>
                <Button
                  onClick={() => { setCallType('video'); setCallStatus('idle'); setTimeout(startCall, 50); }}
                  className="rounded-full h-14 w-14 bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center"
                  title="Chamada de Vídeo"
                >
                  <Video className="h-6 w-6" />
                </Button>
                <Button onClick={onClose} variant="ghost" className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            {callStatus === 'calling' && (
              <div className="flex items-center gap-3 text-slate-300 text-sm font-semibold">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                A conectar...
              </div>
            )}

            {(callStatus === 'ringing' || callStatus === 'calling') && (
              <Button onClick={endCall} className="rounded-full h-14 w-14 bg-rose-600 hover:bg-rose-700 shadow-lg flex items-center justify-center">
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}

            {callStatus === 'ringing' && role === 'callee' && (
              <div className="flex gap-4">
                <Button onClick={declineCall} className="rounded-full h-14 w-14 bg-rose-600 hover:bg-rose-700 shadow-lg flex items-center justify-center">
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button onClick={acceptCall} className="rounded-full h-14 w-14 bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center animate-pulse">
                  <Phone className="h-6 w-6" />
                </Button>
              </div>
            )}

            {callStatus === 'connected' && (
              <>
                <Button
                  onClick={() => {
                    if (meetingModeRef.current === 'cloud') {
                      try {
                        if (isMuted) micRef.current?.startBroadcasting?.();
                        else micRef.current?.stopBroadcasting?.();
                      } catch {
                        /* noop */
                      }
                    }
                    setIsMuted(!isMuted);
                  }}
                  variant="outline"
                  className={`rounded-full h-12 w-12 ${isMuted ? 'bg-rose-500/30 border-rose-500 text-rose-400' : 'bg-white/10 border-white/20 text-white'}`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                {callType === 'video' && (
                  <Button
                    onClick={() => {
                      if (meetingModeRef.current === 'cloud') {
                        try {
                          if (isVideoOn) camRef.current?.stopBroadcasting?.();
                          else camRef.current?.startBroadcasting?.();
                        } catch {
                          /* noop */
                        }
                      }
                      setIsVideoOn(!isVideoOn);
                    }}
                    variant="outline"
                    className={`rounded-full h-12 w-12 ${!isVideoOn ? 'bg-rose-500/30 border-rose-500 text-rose-400' : 'bg-white/10 border-white/20 text-white'}`}
                  >
                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                )}
                <Button onClick={() => endCall()} className="rounded-full h-14 w-14 bg-rose-600 hover:bg-rose-700 shadow-lg flex items-center justify-center">
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function IncomingCallListener({ user, onIncoming }: { user: any; onIncoming: (call: any) => void }) {
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onIncoming({ id: change.doc.id, ...change.doc.data() });
        }
      });
    }, () => {});
    return () => unsub();
  }, [user, onIncoming]);
  return null;
}