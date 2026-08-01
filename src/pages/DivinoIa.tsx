import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Send, Sparkles, Activity, Key, CheckCircle, XCircle, Brain, Cpu } from 'lucide-react';
import { divinoChat, DIVINO_MODELS, recall, remember } from '../lib/divino-core';

const STORAGE_KEY = 'connected_gemini_key';

function getStoredKey(): string {
  try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}
function setStoredKey(k: string) {
  try { localStorage.setItem(STORAGE_KEY, k); } catch { /* noop */ }
}

interface DivinoIaProps {
  user?: any;
  profileData?: any;
}

export default function DivinoIa({ user, profileData }: DivinoIaProps) {
  const [apiKey, setApiKey] = useState(getStoredKey);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [modelId, setModelId] = useState<string>(apiKey ? 'gemini-2.0-flash' : 'divino-core');
  const [messages, setMessages] = useState<{ sender: 'user' | 'divino'; text: string }[]>([
    {
      sender: 'divino',
      text: `Sou o DIVINO IA, o núcleo inteligente da Connected, criado pela Bluewhite Corporation. Uso o motor ${apiKey ? 'Gemini 2.0 Flash (externo)' : 'DIVINO Core (local)'}. Como posso orientar a tua jornada no Mundo Connected?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userName = profileData?.displayName || (user && !user.isGuest ? user.displayName : undefined) || recall('user', 'displayName') || undefined;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSetKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { setKeyError('Insere uma chave válida'); return; }
    setStoredKey(trimmed);
    setApiKey(trimmed);
    setModelId('gemini-2.0-flash');
    setKeyInput('');
    setKeyError('');
  };

  const handleClearKey = () => {
    setStoredKey('');
    setApiKey('');
    setModelId('divino-core');
    setKeyInput('');
  };

  const handleSwitchModel = (id: string) => {
    setModelId(id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    const userMsg = { sender: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    if (userName && !recall('user', 'displayName')) {
      remember('user', 'displayName', userName);
    }

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        text: m.text,
      }));
      const reply = await divinoChat(history, { modelId, apiKey, userName });
      const badge = reply.source === 'knowledge' ? ' 📚' : reply.source === 'memory' ? ' 🧠' : reply.source === 'model' ? ' ☁️' : '';
      setMessages(prev => [...prev, { sender: 'divino', text: reply.text + badge }]);
    } catch (err) {
      console.error('DivinoIA error:', err);
      setMessages(prev => [...prev, {
        sender: 'divino',
        text: `As energias do DIVINO IA estão a ser restauradas. Detalhes: ${String(err)}`,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const activeModel = DIVINO_MODELS.find(m => m.id === modelId) || DIVINO_MODELS[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            DIVINO IA
          </h2>
          <p className="text-slate-700 font-medium text-base">
            O Líder Supremo do ecossistema Connected • Bluewhite Corporation Lda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-white/60 rounded-xl border border-white/40 shadow-sm">
            {DIVINO_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => handleSwitchModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                  modelId === m.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {m.kind === 'local' ? <Cpu className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
                {m.name}
              </button>
            ))}
          </div>
          {apiKey ? (
            <Button variant="ghost" onClick={handleClearKey} className="text-xs text-slate-400 hover:text-red-500 gap-1">
              <XCircle className="h-3 w-3" /> Limpar Chave
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="bg-gradient-to-b from-indigo-950/10 via-white/40 to-white/60 border-indigo-500/20 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
        <CardHeader className="border-b border-indigo-500/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-500 font-black text-xl shadow-lg shadow-indigo-500/20">👑</div>
              <div>
                <CardTitle className="text-slate-900 text-xl font-bold">DIVINO IA</CardTitle>
                <CardDescription className="text-indigo-600 font-medium text-xs flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  {activeModel.kind === 'local' ? 'DIVINO Core ativo • funciona sem chave' : 'Gemini 2.0 Flash ativo • modelo externo opcional'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/70 border border-indigo-200/40 text-indigo-700 text-[10px] px-3 py-1.5 rounded-full font-bold">
                🏢 {activeModel.owner}
              </span>
              {activeModel.requiresKey && !apiKey && (
                <span className="bg-amber-100 text-amber-700 border border-amber-300 text-[10px] px-3 py-1.5 rounded-full font-bold animate-pulse">
                  ⚠️ Chave necessária
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        {activeModel.requiresKey && !apiKey && (
          <CardContent className="p-5 space-y-3 bg-amber-50/40 border-b border-amber-200/40">
            <p className="text-sm text-slate-700 font-medium">
              O modelo <b>{activeModel.name}</b> precisa de uma chave da API Gemini.
              Obtém a tua chave gratuita em{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">
                aistudio.google.com/apikey
              </a>{' '}
              ou usa o <b>DIVINO Core</b> que funciona sem chave.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setKeyError(''); }}
                placeholder="Insere a tua chave Gemini API..."
                className="flex-1 bg-white/70 border border-indigo-200/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                onKeyDown={e => e.key === 'Enter' && handleSetKey()}
              />
              <Button onClick={handleSetKey} className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-500">
                <Key className="h-4 w-4" /> Conectar
              </Button>
            </div>
            {keyError && <p className="text-red-500 text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />{keyError}</p>}
          </CardContent>
        )}

        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-white/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-md' : 'bg-white/80 text-slate-800 border border-indigo-200/50 rounded-bl-none shadow-sm backdrop-blur-md'}`}>
                  {msg.sender === 'divino' && <span className="text-indigo-500 font-black text-xs block mb-1">👑 DIVINO IA</span>}
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/80 border border-indigo-200/50 rounded-2xl rounded-bl-none p-4 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-indigo-500/10 bg-white/30 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunta ao DIVINO IA sobre o Mundo Connected..."
              className="flex-1 glass-input bg-white/70 border-white/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
              disabled={isTyping}
            />
            <Button type="submit" disabled={!input.trim() || isTyping} className="rounded-xl px-6 font-bold shadow-md bg-indigo-600 hover:bg-indigo-500 gap-2">
              {isTyping ? <Activity className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isTyping ? '' : 'Consultar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
