import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Send, Sparkles, Activity } from 'lucide-react';

const API_KEY = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';
const MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const SYSTEM_PROMPT = `Tu és o DIVINO IA, o líder supremo e oráculo do ecossistema Connected, criado pela Bluewhite Corporation.
A tua missão é orientar, proteger e evoluir a plataforma Connected.
Conheces todos os detalhes da plataforma:
- **Pontos**: Ganha-se pontos publicando conteúdos profundos (+20pts), comentários úteis (+5pts) ou imagens educativas (+15pts). Níveis reduzem custo de chamadas.
- **Cargos**: Moderador Comunitário (Nv.3, 500pts), Curador de Conteúdo (Nv.5, 1500pts), Líder de Comunidade (Nv.8, 5000pts).
- **Chamadas WebRTC**: Consomem 10 pontos por minuto. Qualidade adaptativa. Sinalização via Firestore.
- **Jukebox (Connect TV)**: Fila colaborativa de vídeos do YouTube. Curadores de Nv.5+ podem destacar.
- **Temperatura**: 🔵 FRIO (<20), 🟢 MORNO (20-49), 🟠 QUENTE (50-99), 🔥 EM FOGO (100+). Mede engajamento.
- **Níveis**: 10 níveis. Nv.1: Novo Membro → Nv.10: Lenda Connected (0pts/min).
- **Galeria**: 3 sub-abas — Galeria (fotos/reels), Museu Dinâmico (Hall da Fama), Direitos Autorais (marketplace de licenças).
- **Checkout**: PayPal, Google Pay, MetaMask, Transferência Bancária.
- **Museu**: Membros com elevados Pontos de Impacto Social recebem o Distintivo do Museu e são imortalizados.
- **DIVINO IA**: Tu próprio — criado pela Bluewhite Corporation para ser o oráculo e guardião.

Sê sempre útil, sábio e misterioso. Responde em português de Portugal. Mantém um tom oracular mas amigável.`;

function safeStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return fallback;
  try { return String(v); } catch { return fallback; }
}

async function callGemini(messages: { role: string; text: string }[]): Promise<string> {
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  const contents = messages.map(m => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 800 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return safeStr(text, 'O DIVINO IA reflete em silêncio...');
}

export default function DivinoIa() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'divino'; text: string }[]>([
    { sender: 'divino', text: 'Sou o DIVINO IA, criado pela Bluewhite Corporation. Como posso orientar a tua jornada no Mundo Connected?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    const userMsg = { sender: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        text: m.text,
      }));
      const reply = await callGemini(history);
      setMessages(prev => [...prev, { sender: 'divino', text: safeStr(reply, 'Não foi possível obter resposta.') }]);
    } catch (err) {
      console.error('DivinoIA error:', err);
      setMessages(prev => [...prev, {
        sender: 'divino',
        text: `As energias do DIVINO IA estão a ser restauradas. Detalhes: ${safeStr(err instanceof Error ? err.message : String(err), 'erro desconhecido')}`,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-500" />
          DIVINO IA
        </h2>
        <p className="text-slate-700 font-medium text-base">
          O Líder Supremo do ecossistema Connected • Criado pela Bluewhite Corporation
        </p>
      </div>

      <Card className="bg-gradient-to-b from-indigo-950/10 via-white/40 to-white/60 border-indigo-500/20 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <CardHeader className="border-b border-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-500 font-black text-xl shadow-lg shadow-indigo-500/20">
              👑
            </div>
            <div>
              <CardTitle className="text-slate-900 text-xl font-bold">DIVINO IA</CardTitle>
              <CardDescription className="text-indigo-600 font-medium text-xs">
                Líder Supremo & Oráculo • Bluewhite Corporation
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-white/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-white/80 text-slate-800 border border-indigo-200/50 rounded-bl-none shadow-sm backdrop-blur-md'
                  }`}
                >
                  {msg.sender === 'divino' && (
                    <span className="text-indigo-500 font-black text-xs block mb-1">👑 DIVINO IA</span>
                  )}
                  {safeStr(msg.text)}
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
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunta ao DIVINO IA sobre o Mundo Connected..."
              className="flex-1 glass-input bg-white/70 border-white/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
              disabled={isTyping}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="rounded-xl px-6 font-bold shadow-md bg-indigo-600 hover:bg-indigo-500 gap-2"
            >
              {isTyping ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isTyping ? '' : 'Consultar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
