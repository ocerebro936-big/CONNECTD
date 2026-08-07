import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Send, X, Image as ImageIcon, Video, FileText, Mic, MapPin, Smile, Reply, Pencil, Trash2, Check, CheckCheck, Loader2, MessageCircle } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../lib/image-utils';
import { db, storage } from '../firebase';
import { playSound } from '../lib/sound-engine';

interface ChatModalProps {
  user: any;
  profileData: any;
  chatUser: any;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: number;
  type?: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location';
  fileName?: string;
  lat?: number;
  lng?: number;
  read?: boolean;
  edited?: boolean;
  editedAt?: number;
  replyToId?: string;
  replyToText?: string;
  reactions?: Record<string, string[]>;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EDIT_WINDOW_MS = 15 * 60 * 1000;

const getChatId = (a: string, b: string) => [a, b].sort().join('_');

export function ChatModal({ user, profileData, chatUser, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [msgMenuFor, setMsgMenuFor] = useState<string | null>(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatId = getChatId(user?.uid || '', chatUser.id);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      const mine = all.filter((m) =>
        (m.senderId === user.uid && m.receiverId === chatUser.id) ||
        (m.senderId === chatUser.id && m.receiverId === user.uid)
      );
      setMessages(prev => {
        const prevCount = prev.length;
        const newCount = mine.length;
        if (newCount > prevCount && prevCount > 0) {
          const newest = mine[mine.length - 1];
          if (newest && newest.senderId === chatUser.id) {
            playSound('message');
          }
        }
        return mine;
      });
      scrollToBottom();
    });
    return () => unsub();
  }, [user, chatUser.id, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    const typingDoc = doc(db, 'typing', chatId);
    const unsub = onSnapshot(typingDoc, (snap) => {
      const data = snap.data();
      setTyping(!!data && data.userId !== user.uid && Date.now() - (data.at || 0) < 4000);
    });
    return () => unsub();
  }, [user, chatId]);

  useEffect(() => {
    if (!user || !chatUser) return;
    const unread = messages.filter((m) => m.senderId === chatUser.id && !m.read);
    if (unread.length > 0) {
      unread.forEach((m) => {
        updateDoc(doc(db, 'messages', m.id), { read: true }).catch(() => {});
      });
    }
  }, [messages, user, chatUser]);

  useEffect(() => {
    if (!user) return;
    const typingDoc = doc(db, 'typing', chatId);
    return () => {
      setDoc(typingDoc, { userId: user.uid, at: 0 }).catch(() => {});
    };
  }, [user, chatId]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (!user) return;
    const typingDoc = doc(db, 'typing', chatId);
    setDoc(typingDoc, { userId: user.uid, at: Date.now() }).catch(() => {});
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      setDoc(typingDoc, { userId: user.uid, at: 0 }).catch(() => {});
    }, 3000);
  };

  const sendMessage = async (content: string, extra: Partial<ChatMessage> = {}) => {
    if (!user || !content.trim()) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: chatUser.id,
        participants: [user.uid, chatUser.id],
        senderName: profileData.displayName || user.email?.split('@')[0] || 'Unknown',
        senderAvatar: profileData.photoURL || '',
        content: content.trim(),
        createdAt: Date.now(),
        read: false,
        type: 'text',
        replyToId: replyTo?.id || '',
        replyToText: replyTo ? (replyTo.content || '') : '',
        ...extra,
      });
      setNewMessage('');
      setReplyTo(null);
      const typingDoc = doc(db, 'typing', chatId);
      setDoc(typingDoc, { userId: user.uid, at: 0 }).catch(() => {});
      scrollToBottom();
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File, kind: 'image' | 'video' | 'document') => {
    if (!user) return;
    setIsUploading(true);
    try {
      const dataUrl = kind === 'image' ? await compressImage(file) : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const fileName = `chat_${Date.now()}_${user.uid}`;
      const storageRef = ref(storage, `chat/${kind}s/${fileName}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
      await uploadString(storageRef, dataUrl, 'data_url');
      const url = await getDownloadURL(storageRef);
      await sendMessage(kind === 'document' ? file.name : '', {
        type: kind,
        content: url,
        fileName: kind === 'document' ? file.name : undefined,
      });
    } catch (e) {
      console.error('Error uploading:', e);
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          setIsUploading(true);
          try {
            const storageRef = ref(storage, `chat/audio/audio_${Date.now()}_${user.uid}.webm`);
            await uploadString(storageRef, reader.result as string, 'data_url');
            const url = await getDownloadURL(storageRef);
            await sendMessage('🎤 Mensagem de voz', { type: 'audio', content: url });
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      rec.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Mic error:', e);
      alert('Permite o acesso ao microfone para gravar áudio.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendLocation = () => {
    if (!navigator.geolocation) return;
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await sendMessage(`📍 Localização: https://maps.google.com/?q=${latitude},${longitude}`, {
          type: 'location',
          lat: latitude,
          lng: longitude,
        });
        setSendingLocation(false);
      },
      () => {
        setSendingLocation(false);
        alert('Não foi possível obter a localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    const reactions = { ...(msg?.reactions || {}) };
    const users = [...(reactions[emoji] || [])];
    const idx = users.indexOf(user.uid);
    if (idx >= 0) users.splice(idx, 1);
    else users.push(user.uid);
    if (users.length === 0) delete reactions[emoji];
    else reactions[emoji] = users;
    await updateDoc(doc(db, 'messages', msgId), { reactions }).catch((e) => console.error(e));
    setShowEmojiFor(null);
  };

  const editMessage = async () => {
    if (!editingMsg || !newMessage.trim()) return;
    await updateDoc(doc(db, 'messages', editingMsg.id), {
      content: newMessage.trim(),
      edited: true,
      editedAt: Date.now(),
    }).catch((e) => console.error(e));
    setEditingMsg(null);
    setNewMessage('');
  };

  const deleteMessage = async (msg: ChatMessage) => {
    const age = Date.now() - (msg.createdAt || 0);
    if (age < EDIT_WINDOW_MS) {
      await deleteDoc(doc(db, 'messages', msg.id)).catch((e) => console.error(e));
    } else {
      await updateDoc(doc(db, 'messages', msg.id), { content: '🗑️ Mensagem apagada' }).catch((e) => console.error(e));
    }
    setMsgMenuFor(null);
  };

  const canEdit = (m: ChatMessage) => m.senderId === user?.uid && Date.now() - (m.createdAt || 0) < EDIT_WINDOW_MS && !m.edited;

  const renderMessageContent = (m: ChatMessage) => {
    if (m.type === 'image') return <img src={m.content} alt="Fotografia" className="max-h-64 rounded-xl object-cover" />;
    if (m.type === 'video') return <video src={m.content} controls className="max-h-64 rounded-xl max-w-full" />;
    if (m.type === 'audio') return <audio src={m.content} controls className="max-w-[220px]" />;
    if (m.type === 'document') return (
      <a href={m.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/30">
        <FileText className="h-4 w-4 shrink-0" /> {m.fileName || 'Documento'}
      </a>
    );
    if (m.type === 'location') return (
      <a href={m.content.replace('📍 Localização: ', '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold underline">
        <MapPin className="h-4 w-4 shrink-0" /> {m.content}
      </a>
    );
    return m.content;
  };

  const myMessages = messages.filter((m) => m.senderId === user?.uid);
  const lastReadMsg = myMessages.filter((m) => m.read).pop();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <CardShell onClick={(e) => e.stopPropagation()}>
        <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/50">
              <AvatarImage src={chatUser.photoURL || "https://github.com/shadcn.png"} />
              <AvatarFallback>{chatUser.displayName?.[0] || chatUser.email?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-white">{chatUser.displayName || chatUser.email?.split('@')[0]}</h3>
              <p className="text-xs text-white/80">
                {typing ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> a escrever...</span> : 'Conectado · encriptado em trânsito'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 relative">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 font-medium py-10 flex flex-col items-center">
              <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
              Diga olá a {chatUser.displayName || 'este utilizador'}!
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.uid;
              const reactions = m.reactions || {};
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group`}>
                  {m.replyToId && (
                    <div className={`text-[10px] px-3 py-1 mb-1 max-w-[70%] truncate rounded-lg ${isMe ? 'bg-white/30' : 'bg-slate-100'} text-slate-500 font-semibold`}>
                      <Reply className="h-3 w-3 inline mr-1" />{m.replyToText || 'Resposta'}
                    </div>
                  )}
                  <div className="relative">
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm whitespace-pre-wrap break-words ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}`}>
                      {renderMessageContent(m)}
                      {m.edited && <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-slate-400'} ml-1`}>(editada)</span>}
                    </div>
                    {Object.keys(reactions).length > 0 && (
                      <div className="absolute -bottom-2 left-2 flex gap-0.5 bg-white rounded-full shadow border border-slate-200 px-1.5 py-0.5">
                        {Object.entries(reactions).map(([emoji, users]) => (
                          <span key={emoji} className={`text-xs ${(users as string[]).includes(user?.uid) ? 'scale-125' : ''}`} title={`${(users as string[]).length} reação(ões)`}>{emoji}</span>
                        ))}
                      </div>
                    )}
                    <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1">
                      <button onClick={() => setShowEmojiFor(showEmojiFor === m.id ? null : m.id)} className="p-1 bg-white rounded-full shadow border border-slate-200 hover:scale-110 transition-transform"><Smile className="h-3.5 w-3.5 text-slate-600" /></button>
                      {canEdit(m) && (
                        <button onClick={() => { setEditingMsg(m); setNewMessage(m.content); }} className="p-1 bg-white rounded-full shadow border border-slate-200 hover:scale-110 transition-transform"><Pencil className="h-3.5 w-3.5 text-blue-500" /></button>
                      )}
                      <button onClick={() => setMsgMenuFor(msgMenuFor === m.id ? null : m.id)} className="p-1 bg-white rounded-full shadow border border-slate-200 hover:scale-110 transition-transform"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      m.read ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        : <Check className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  {showEmojiFor === m.id && (
                    <div className="absolute z-10 bg-white rounded-full shadow-lg border border-slate-200 px-2 py-1 flex gap-1 -bottom-8">
                      {REACTIONS.map((r) => (
                        <button key={r} onClick={() => addReaction(m.id, r)} className="text-base hover:scale-125 transition-transform">{r}</button>
                      ))}
                    </div>
                  )}
                  {msgMenuFor === m.id && (
                    <div className="absolute z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-1 w-40 -bottom-10 right-0">
                      {isMe && (
                        <button
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                          onClick={() => setReplyTo(m)}
                        >
                          <Reply className="h-3 w-3 inline mr-1" /> Responder
                        </button>
                      )}
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={() => deleteMessage(m)}
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" /> Apagar{isMe ? ' para todos' : ''}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {typing && (
            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:100ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:200ms]" />
              </span>
              {chatUser.displayName} está a escrever...
            </div>
          )}
        </div>

        {replyTo && (
          <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
            <p className="text-xs text-indigo-700 font-semibold truncate">
              <Reply className="h-3 w-3 inline mr-1" />A responder a: {replyTo.content || 'Mídia'}
            </p>
            <button onClick={() => setReplyTo(null)} className="text-indigo-400 hover:text-indigo-700"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="p-3 bg-white border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'video')}
            />
            <input
              ref={mediaRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'document')}
            />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 rounded-xl" title="Enviar fotografia" onClick={() => fileRef.current?.click()} disabled={isUploading}>
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-cyan-600 hover:bg-cyan-50 rounded-xl" title="Enviar vídeo" onClick={() => videoRef.current?.click()} disabled={isUploading}>
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl" title="Enviar documento" onClick={() => mediaRef.current?.click()} disabled={isUploading}>
              <FileText className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-xl ${isRecording ? 'text-white bg-rose-500 hover:bg-rose-600 animate-pulse' : 'text-rose-600 hover:bg-rose-50'}`}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-600 hover:bg-amber-50 rounded-xl" title="Partilhar localização" onClick={sendLocation} disabled={isUploading || sendingLocation}>
              <MapPin className="h-5 w-5" />
            </Button>
            {isUploading && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={editingMsg ? 'Editar mensagem...' : 'Escreve a tua mensagem...'}
              className="flex-1 glass-input bg-slate-100 border-transparent text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white"
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingMsg) editMessage();
                  else sendMessage(newMessage);
                }
              }}
            />
            <Button
              onClick={() => { if (editingMsg) editMessage(); else sendMessage(newMessage); }}
              disabled={!newMessage.trim() || isSending || isUploading}
              className="rounded-xl px-4 shadow-sm h-10 w-12 p-0 flex justify-center"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMsg ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardShell>
    </div>
  );
}

function CardShell({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div className="w-full max-w-md bg-white border-white/20 shadow-2xl overflow-hidden flex flex-col h-[550px] sm:h-[600px] rounded-2xl" onClick={onClick}>
      {children}
    </div>
  );
}
