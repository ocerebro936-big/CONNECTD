import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Award } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserLevelBadge } from './UserLevelBadge';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallModalProps {
  user: any;
  targetUser: any;
  onClose: () => void;
}

export function CallModal({ user, targetUser, onClose }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setUserPoints(snap.data().points || 0);
      });
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      pcRef.current?.close();
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoOn,
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      throw new Error('Permissão de câmara/microfone negada.');
    }
  };

  const startCall = async () => {
    setError('');
    if (userPoints < 10) {
      setError('Pontos insuficientes! Publique conteúdos úteis para ganhar saldo.');
      return;
    }
    setCallStatus('calling');
    try {
      const stream = await startLocalStream();
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = async (e) => {
        if (e.candidate && callIdRef.current) {
          await addDoc(collection(db, 'calls', callIdRef.current, 'ice'), e.candidate.toJSON());
        }
      };

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: user.uid,
        callerName: user.displayName || user.email?.split('@')[0],
        callerAvatar: user.photoURL || '',
        receiverId: targetUser.id,
        status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: Date.now(),
      });
      callIdRef.current = callRef.id;
      setCallStatus('ringing');

      await updateDoc(doc(db, 'users', user.uid), { points: increment(-10) });
      setUserPoints(p => p - 10);

      const unsub = onSnapshot(doc(db, 'calls', callRef.id), (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.status === 'answered' && data.answer) {
          setCallStatus('connected');
          const answer = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answer);
          let sec = 0;
          timerRef.current = setInterval(() => {
            sec++;
            setCallDuration(sec);
            if (sec % 60 === 0) {
              updateDoc(doc(db, 'users', user.uid), { points: increment(-10) }).catch(() => {});
              setUserPoints(p => Math.max(0, p - 10));
            }
          }, 1000);
          unsub();
        }
        if (data.status === 'ended' || data.status === 'rejected') {
          endCall();
        }
      });
    } catch (e: any) {
      setError(e.message || 'Erro ao iniciar chamada.');
      setCallStatus('idle');
    }
  };

  const endCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    pcRef.current?.close();
    setCallStatus('ended');
    if (callIdRef.current) {
      await updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended' }).catch(() => {});
    }
    localVideoRef.current?.srcObject?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    setTimeout(onClose, 2000);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-slate-900 border-white/20 shadow-2xl overflow-hidden">
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
          {/* Remote video */}
          <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
            {callStatus === 'connected' ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-slate-500">
                <Avatar className="h-24 w-24 mx-auto mb-3 border-2 border-white/20">
                  <AvatarImage src={targetUser.photoURL || 'https://github.com/shadcn.png'} />
                  <AvatarFallback className="text-4xl">{targetUser.displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">{callStatus === 'ringing' ? 'Chamada em curso...' : 'A estabelecer ligação...'}</p>
              </div>
            )}

            {/* Local video (PIP) */}
            {callStatus === 'connected' && (
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

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 p-6 bg-slate-800/50">
            {callStatus === 'idle' && (
              <>
                <Button onClick={startCall} className="rounded-full h-14 w-14 bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center">
                  <Phone className="h-6 w-6" />
                </Button>
                <Button onClick={onClose} variant="ghost" className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </>
            )}

            {(callStatus === 'calling' || callStatus === 'ringing') && (
              <Button onClick={endCall} className="rounded-full h-14 w-14 bg-rose-600 hover:bg-rose-700 shadow-lg flex items-center justify-center">
                <PhoneOff className="h-6 w-6" />
              </Button>
            )}

            {callStatus === 'connected' && (
              <>
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="outline"
                  className={`rounded-full h-12 w-12 ${isMuted ? 'bg-rose-500/30 border-rose-500 text-rose-400' : 'bg-white/10 border-white/20 text-white'}`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  variant="outline"
                  className={`rounded-full h-12 w-12 ${!isVideoOn ? 'bg-rose-500/30 border-rose-500 text-rose-400' : 'bg-white/10 border-white/20 text-white'}`}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button onClick={endCall} className="rounded-full h-14 w-14 bg-rose-600 hover:bg-rose-700 shadow-lg flex items-center justify-center">
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
