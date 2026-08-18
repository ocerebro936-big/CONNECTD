import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Sparkles, Trash2 } from 'lucide-react';
import { divino, localStorageMemory, type DivinoUserContext, type DivinoMessage, type DivinoResponse } from '../lib/divino-engine';

interface DivinoMordomoProps {
  user: any;
  profileData: any;
  allUsers: any[];
  followingIds: string[];
  onNavigate: (tab: string) => void;
  onCreatePost: () => void;
  handleFollow: (targetId: string, targetName: string, targetAvatar?: string) => void;
}

interface UIMessage extends DivinoMessage {
  id: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function DivinoMordomo({
  user,
  profileData,
  allUsers,
  followingIds,
  onNavigate,
  onCreatePost,
  handleFollow,
}: DivinoMordomoProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx: DivinoUserContext = {
    id: user?.uid,
    name: profileData?.displayName || user?.email?.split('@')[0] || 'amigo',
    tags: (profileData?.tags || '')
      .toString()
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean),
    country: profileData?.country,
    followerCount: followingIds?.length || 0,
    postCount: profileData?.postCount || 0,
  };

  useEffect(() => {
    if (!open || !user) return;
    const saved = localStorageMemory.load(user.uid).map((m) => ({ ...m, id: uid() }));
    if (saved.length) {
      setMessages(saved);
    } else {
      const welcome = divino.initialMessage(ctx);
      setMessages([{ id: uid(), role: 'divino', text: welcome.text, quickActions: welcome.quickActions }]);
    }
  }, [open, user?.uid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    const userMsg: UIMessage = { id: uid(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);
    try {
      const res: DivinoResponse = await divino.respond(ctx, trimmed);
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'divino', text: res.text, quickActions: res.quickActions },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'divino', text: 'Desculpa, tive um pequeno erro. Tenta de novo.' },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const onQuickAction = (actionId: string, label: string) => {
    switch (actionId) {
      case 'explorar':
        onNavigate('feed');
        return;
      case 'ver_tv':
        onNavigate('connect-tv');
        return;
      case 'encontrar_pessoas':
        onNavigate('connections');
        return;
      case 'criar_post':
        onCreatePost();
        return;
      default:
        // continua a conversa com o DIVINO
        send(label);
    }
  };

  const clearMemory = () => {
    if (!user) return;
    divino.clearMemory(user.uid);
    const welcome = divino.initialMessage(ctx);
    setMessages([{ id: uid(), role: 'divino', text: welcome.text, quickActions: welcome.quickActions }]);
  };

  if (!user) return null;

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
          title="Falar com o DIVINO"
          aria-label="Abrir DIVINO"
        >
          <span className="text-2xl">🤵</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Painel */}
      {open && (
        <div className="fixed bottom-6 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm h-[32rem] max-h-[80vh] glass-card rounded-2xl shadow-2xl border border-white/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between gap-2 p-3 border-b border-white/30 bg-gradient-to-r from-amber-500/20 to-amber-600/10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤵</span>
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight">DIVINO</p>
                <p className="text-[10px] font-semibold text-slate-600">Mordomo da Connected King</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearMemory} title="Limpar memória" className="text-slate-500 hover:text-rose-600 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-800 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-white/30">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-white/90 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-snug">{m.text}</p>
                  {m.quickActions && m.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.quickActions.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onQuickAction(a.id, a.label)}
                          className="text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg px-2 py-1 transition-colors"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white/90 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" /> a pensar…
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/30 bg-white/40">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder="Escreve uma mensagem…"
                className="flex-1 glass-input bg-white/70 border-white/50 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
