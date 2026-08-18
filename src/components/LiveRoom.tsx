import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { X, Send, Share2, Eye, Heart, ThumbsUp, Flame, Gift as GiftIcon, Trash2 } from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, increment, limit as firestoreLimit, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { playSound } from '../lib/sound-engine';
import { recordTransaction } from '../lib/finance-utils';

interface LiveData {
  id?: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description?: string;
  coverUrl?: string;
  status?: 'live' | 'ended';
  mode?: string;
  streamUrl?: string;
  viewers?: number;
  createdAt: number;
}

interface LiveRoomModalProps {
  live: LiveData;
  user: any;
  profileData: any;
  onClose: () => void;
  onEndLive?: (liveId: string) => void;
}

const LIVE_REACTIONS = [
  { emoji: '😍', label: 'Adoro', icon: Heart },
  { emoji: '👍', label: 'Gosto', icon: ThumbsUp },
  { emoji: '🔥', label: 'Fogo', icon: Flame },
];

const LIVE_GIFTS = [
  { emoji: '💖', name: 'Coração', points: 5 },
  { emoji: '🎉', name: 'Festa', points: 10 },
  { emoji: '👑', name: 'Coroa', points: 20 },
  { emoji: '🚀', name: 'Foguete', points: 50 },
];

export function LiveRoom({ live, user, profileData, onClose, onEndLive }: LiveRoomModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(live.viewers || 0);
  const [isSending, setIsSending] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);
  const isModerator = profileData?.role === 'admin' || (user && user.email === 'ocerebro936@gmail.com');
  const isOwner = user?.uid === live.userId;

  useEffect(() => {
    if (!live.id) return;
    const unsub = onSnapshot(
      query(collection(db, 'lives', live.id, 'chat'), orderBy('createdAt', 'asc'), firestoreLimit(80)),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error(e)
    );
    return () => unsub();
  }, [live.id]);

  useEffect(() => {
    if (!live.id) return;
    updateDoc(doc(db, 'lives', live.id), { viewers: increment(1) }).catch(() => {});
    return () => {
      updateDoc(doc(db, 'lives', live.id), { viewers: increment(-1) }).catch(() => {});
    };
  }, [live.id]);

  useEffect(() => {
    setViewerCount((c) => c + 1);
    return () => setViewerCount((c) => Math.max(0, c - 1));
  }, []);

  const sendMessage = async (content: string) => {
    if (!user || !content.trim() || !live.id) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'lives', live.id, 'chat'), {
        liveId: live.id,
        userId: user.uid,
        authorName: profileData.displayName || user.email?.split('@')[0] || 'Espectador',
        authorAvatar: profileData.photoURL || '',
        content: content.trim(),
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    setReactionBurst(null);
    requestAnimationFrame(() => setReactionBurst(emoji));
    setTimeout(() => setReactionBurst(null), 1200);
    await sendMessage(`reaction:${emoji}`);
  };

const sendGift = async (gift: { emoji: string; name: string; points: number }) => {
    await sendMessage(`🎁 ${gift.emoji} ${gift.name} (${gift.points} pts)`);
    if (user) {
      recordTransaction({
        userId: user.uid,
        type: 'gift_sent',
        description: `Presente ${gift.emoji} ${gift.name} (${gift.points} pts) na live "${live.title}"`,
        amount: gift.points,
        currency: 'pts',
        refId: live.id || '',
        actorId: user.uid,
      }).catch(() => {});
    }
    playSound('live');
  };

  const shareLive = async () => {
    const url = `${window.location.origin}${window.location.pathname}?live=${live.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: live.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link da live copiado!');
      }
    } catch {
      /* cancelado */
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'lives', live.id, 'chat', msgId));
    } catch (e) {
      console.error('Error deleting message:', e);
    }
  };

  const renderLiveContent = () => {
    if (live.mode === 'app' && isOwner) {
      return (
        <img
          src={live.coverUrl || `https://picsum.photos/seed/live${live.userId}/960/540`}
          alt={live.title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      );
    }
    if (live.streamUrl && live.status === 'live') {
      return (
        <video src={live.streamUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline loop />
      );
    }
    return (
      <img
        src={live.coverUrl || `https://picsum.photos/seed/live${live.userId}/960/540`}
        alt={live.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-4xl glass-card border-white/30 shadow-2xl overflow-hidden relative rounded-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh]">
          {/* Video */}
          <div className="relative w-full md:flex-1 aspect-video md:aspect-auto md:min-h-[420px] bg-black">
            {renderLiveContent()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-rose-500/60 px-3 py-1 text-xs font-black text-white bg-rose-600/80 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse"></span> AO VIVO
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/95 bg-black/50 rounded-full px-2.5 py-1 backdrop-blur-md">
                <Eye className="h-3 w-3" /> {viewerCount}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/80 shadow-lg">
                <AvatarImage src={live.authorAvatar} />
                <AvatarFallback className="bg-primary/20 text-primary">{live.authorName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-white font-bold text-base truncate drop-shadow">{live.title}</h3>
                <p className="text-white/80 text-xs font-medium">{live.authorName}</p>
              </div>
              <button onClick={shareLive} className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-md" title="Partilhar live">
                <Share2 className="h-4 w-4" />
              </button>
              {isOwner && onEndLive && (
                <Button size="sm" className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500" onClick={() => onEndLive(live.id || '')}>
                  Terminar Live
                </Button>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white/85 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/40">
              <p className="font-bold text-slate-900 text-sm">💬 Chat ao Vivo</p>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reaction burst overlay */}
            {reactionBurst && (
              <div className="pointer-events-none absolute bottom-24 right-6 text-6xl animate-bounce z-10 drop-shadow-2xl">
                {reactionBurst}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] scrollbar-thin scrollbar-thumb-slate-300">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6 font-medium">Sê o primeiro a comentar!</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.content.startsWith('🎁') ? 'bg-amber-500/10 border border-amber-300/40 rounded-2xl p-1.5' : ''}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={m.authorAvatar} />
                    <AvatarFallback className="text-[10px]">{m.authorName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%] shadow-sm bg-white/85">
                    <span className="font-bold text-slate-900 mr-2 text-[11px]">{m.authorName}</span>
                    <span className="break-words text-slate-800">
                      {m.content.startsWith('reaction:') ? (
                        <span className="text-2xl">{m.content.replace('reaction:', '')}</span>
                      ) : (
                        m.content
                      )}
                    </span>
                  </div>
                  {isModerator && (
                    <button onClick={() => deleteMessage(m.id)} className="self-center text-slate-400 hover:text-rose-600 transition-colors shrink-0" title="Apagar (moderação)">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Reactions + Gifts */}
            <div className="px-4 pt-1 flex items-center gap-1.5">
              {LIVE_REACTIONS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => sendReaction(r.emoji)}
                  title={r.label}
                  className="text-lg rounded-lg px-2 py-1 border border-slate-200 bg-white/80 hover:scale-110 hover:bg-slate-50 transition-all"
                >
                  {r.emoji}
                </button>
              ))}
              <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">
                <GiftIcon className="h-3 w-3 text-pink-500" /> Presentes
              </span>
              {LIVE_GIFTS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => sendGift(g)}
                  title={`${g.name} — ${g.points} pts`}
                  className="text-lg rounded-lg px-1.5 py-0.5 border border-slate-200 bg-white/80 hover:scale-110 hover:bg-amber-50 transition-all"
                >
                  {g.emoji}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="mt-3 flex gap-2 p-4 pt-2 border-t border-slate-200/80">
              <input
                type="text"
                placeholder="Comentar..."
                className="flex-1 glass-input bg-white/70 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(newMessage); setNewMessage(''); } }}
              />
              <Button
                onClick={() => { sendMessage(newMessage); setNewMessage(''); }}
                disabled={!newMessage.trim() || isSending}
                className="rounded-xl px-4 h-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveRoom;