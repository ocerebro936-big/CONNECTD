// ============================================================================
// DivinoAssistant — ÚNICO ponto de entrada do DIVINO (botão flutuante).
// ----------------------------------------------------------------------------
// Substitui os botões DIVINO espalhados. Painel com:
//   Conversa · Memória · Perfil · Ajuda · Estado da Connected · Ferramentas
// Usa o DivinoBrain.think() (intent/context/memory/reasoning) — sem keywords.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Brain, MessageCircle, Database, User, HelpCircle, Activity, Wrench, X, Send } from "lucide-react";
import { getBrain } from "../lib/divino/core/cognition";
import { memoryManager } from "../lib/divino/memory/memory-manager";
import { getDivinoOnboarding } from "../lib/divino/onboarding";
import { getCloudSupervision } from "../lib/connected-reactor/supervision";

type Tab = "chat" | "memory" | "profile" | "help" | "status" | "tools";

const CAPABILITIES = [
  "cloud_status", "global_cloud_status", "edge_status", "cache_status",
  "delivery_trace", "best_node", "node_status", "cloud_trace", "reactor",
];

export default function DivinoAssistant({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "divino", text: "Olá 👑 Sou o DIVINO, o assistente da Connected King. Como posso ajudar?" },
  ]);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid;

  useEffect(() => {
    if (open && uid) {
      getDivinoOnboarding(uid).then((s) => setProfile(s.profile)).catch(() => {});
      setStatus(getCloudSupervision());
    }
  }, [open, uid]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy || !uid) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await getBrain(uid).think({ uid, role: "user", text });
      setMessages((m) => [...m, { role: "divino", text: r.text }]);
    } catch {
      setMessages((m) => [...m, { role: "divino", text: "Desculpa, tive um pequeno erumo. Tenta de novo." }]);
    } finally {
      setBusy(false);
    }
  }

  async function clearMemory() {
    if (!uid) return;
    await memoryManager.forget(uid).catch(() => {});
    setMessages((m) => [...m, { role: "divino", text: "Memória do DIVINO apagada para a tua conta." }]);
  }

  const TabBtn = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${tab === id ? "text-primary bg-primary/10" : "text-slate-400 hover:text-white"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <>
      {/* Botão flutuante — canto inferior direito, acima do mini-player de música */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b97e00] text-black shadow-2xl shadow-amber-900/40 grid place-items-center hover:scale-105 transition-transform"
        aria-label="Abrir DIVINO"
      >
        <Brain className="h-7 w-7" />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0b0f1a]" />
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-50 w-[min(92vw,380px)] h-[min(70vh,560px)] glass-dark border border-primary/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-black text-white">DIVINO 👑</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-300 hover:text-white"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 bg-white/5">
            <TabBtn id="chat" icon={MessageCircle} label="Conversa" />
            <TabBtn id="memory" icon={Database} label="Memória" />
            <TabBtn id="profile" icon={User} label="Perfil" />
            <TabBtn id="status" icon={Activity} label="Estado" />
            <TabBtn id="tools" icon={Wrench} label="Ferramentas" />
            <TabBtn id="help" icon={HelpCircle} label="Ajuda" />
          </div>

          <div className="flex-1 overflow-auto p-3">
            {tab === "chat" && (
              <div className="space-y-2" ref={scrollRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-black" : "bg-white/10 text-white"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {busy && <p className="text-xs text-slate-400">DIVINO está a pensar…</p>}
              </div>
            )}

            {tab === "memory" && (
              <div className="space-y-2 text-sm text-slate-200">
                <p>A tua memória é usada apenas para personalizar conversas, com o teu consentimento (definido no onboarding).</p>
                <button onClick={clearMemory} className="glass-chip text-xs text-rose-300">Apagar memória do DIVINO</button>
              </div>
            )}

            {tab === "profile" && (
              <div className="space-y-1 text-sm text-slate-200">
                {profile ? (
                  <>
                    <p><b>Nome:</b> {profile.fullName || "—"}</p>
                    <p><b>Data nasc.:</b> {profile.birthDate || "— (opcional)"}</p>
                    <p><b>Local:</b> {profile.birthPlace || "— (opcional)"}</p>
                    <p><b>Pagamento:</b> {profile.paymentMethod || "—"}</p>
                    <p><b>Memória:</b> {profile.consentToMemory ? "consentida" : "sem memória"}</p>
                  </>
                ) : <p className="text-slate-400">A carregar perfil…</p>}
              </div>
            )}

            {tab === "status" && (
              <div className="space-y-1 text-sm text-slate-200 whitespace-pre-wrap">
                {status ? status.text : "—"}
              </div>
            )}

            {tab === "tools" && (
              <div className="space-y-1 text-sm text-slate-200">
                <p className="text-slate-400 text-xs">Ferramentas autorizadas que o DIVINO pode consultar:</p>
                {CAPABILITIES.map((c) => <p key={c} className="font-mono text-xs">• {c}</p>)}
              </div>
            )}

            {tab === "help" && (
              <div className="space-y-2 text-sm text-slate-200">
                <p>O DIVINO entende, consulta e explica — e pede confirmação quando uma ação é destrutiva.</p>
                <p>Exemplos:</p>
                <p>• "Como está a Connected Cloud?"</p>
                <p>• "Qual o melhor Node agora?"</p>
                <p>• "Mostra o rasto de entrega."</p>
              </div>
            )}
          </div>

          {tab === "chat" && (
            <div className="flex items-center gap-2 p-2 border-t border-white/10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Fala com o DIVINO…"
                className="flex-1 glass-input-dark rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
              <button onClick={send} disabled={busy} className="h-9 w-9 rounded-full bg-primary text-black grid place-items-center disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
