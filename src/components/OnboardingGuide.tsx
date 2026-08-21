import React, { useState } from "react";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface Step {
  key: string;
  title: string;
  desc: string;
  icon: string;
}

const STEPS: Step[] = [
  { key: "feed", title: "Feed", desc: "Vê e partilha o que a comunidade Connected está a publicar.", icon: "📰" },
  { key: "divino", title: "DIVINO IA", desc: "O teu mordomo inteligente. Pergunta sobre a Cloud, economia ou como usar a Connected King.", icon: "🤵" },
  { key: "cloud", title: "Cloud", desc: "Armazena os teus ficheiros na Connected Cloud com identidade e monitorização reais.", icon: "☁️" },
  { key: "economy", title: "Economia", desc: "Pontos, gems e saldo real (MZN) que ganhas a usar a plataforma.", icon: "💰" },
  { key: "run", title: "Connected RUN", desc: "O jogo da Connected King. Sobe de nível e representa a tua região.", icon: "🏃" },
  { key: "perfil", title: "Perfil", desc: "O teu espaço: conexões, música, empresas e definições.", icon: "👤" },
];

const STORAGE_KEY = "ck_onboarded_v1";

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function OnboardingGuide({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="ck-glass-strong w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[var(--ck-border)] animate-in fade-in slide-in-from-bottom-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold tracking-widest uppercase text-[var(--ck-gold)]">
            Bem-vindo à Connected King
          </span>
          <button onClick={finish} className="text-white/60 hover:text-white" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-5xl mb-3">{step.icon}</div>
        <h2 className="text-xl font-black text-white">{step.title}</h2>
        <p className="text-sm text-white/70 mt-1 leading-relaxed">{step.desc}</p>

        <div className="flex items-center gap-1.5 my-5">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= index ? "bg-[var(--ck-gold)]" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => (index === 0 ? finish() : setIndex((i) => i - 1))}
            className="flex items-center gap-1 text-sm text-white/70 hover:text-white px-2 py-2"
          >
            {index === 0 ? <Check className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {index === 0 ? "Já sei" : "Anterior"}
          </button>
          <button
            onClick={() => (last ? finish() : setIndex((i) => i + 1))}
            className="flex items-center gap-1 rounded-xl bg-[var(--ck-gold)] text-black font-bold px-4 py-2 hover:scale-[1.03] transition-transform"
          >
            {last ? "Começar" : "Próximo"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
