// ============================================================================
// DivinoOnboarding — interface cognitiva do onboarding.
// ----------------------------------------------------------------------------
// O DIVINO pergunta e explica; o utilizador decide o que fornece.
// As respostas em texto livre são interpretadas pelo DivinoBrain.think()
// (intent + context + memory + reasoning) — NUNCA por "includes('nome')".
// Apenas o valor que o utilizador escreveu é guardado (respeitando a
// privacidade: data/local e pagamento são opcionais; nunca dados de cartão).
// ============================================================================
import { useState } from "react";
import {
  finishDivinoOnboarding,
  saveDivinoAnswer,
  savePaymentMethod,
  type OnboardingStep,
  type PaymentMethod,
} from "../lib/divino/onboarding";
import { getBrain } from "../lib/divino/core/cognition";

interface Props {
  uid: string;
  onComplete: () => void;
}

const QUESTIONS: Record<
  Exclude<OnboardingStep, "welcome" | "complete" | "paymentMethod" | "consent">,
  string
> = {
  fullName: "Qual é o seu nome completo?",
  birthDate: "Qual é a sua data de nascimento? Pode saltar esta pergunta.",
  birthPlace: "Onde nasceu? Esta informação é opcional.",
  paymentContact:
    "Qual contacto pretende utilizar para receber pagamentos? Pode deixar para depois.",
};

export default function DivinoOnboarding({ uid, onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // Cérebro cognitivo: interpreta a resposta livre (nome, data, local…)
  // via intent/context/memory. Não usamos palavras-chave para decidir.
  async function cognize(text: string) {
    try {
      await getBrain(uid).think({ uid, role: "user", text });
    } catch {
      /* o onboarding não falha se o cérebro estiver indisponível */
    }
  }

  async function submit() {
    setLoading(true);
    try {
      if (step === "welcome") {
        setStep("fullName");
        return;
      }

      if (
        step === "fullName" ||
        step === "birthDate" ||
        step === "birthPlace" ||
        step === "paymentContact"
      ) {
        if (!answer.trim() && step === "fullName") return;

        // O cérebro processa a resposta (memória/contexto). Guardamos o
        // valor literal que o utilizador decidiu partilhar.
        await cognize(answer);
        const result = await saveDivinoAnswer(uid, step, answer);
        setAnswer("");
        setStep(result.step);
        return;
      }

      if (step === "paymentMethod") {
        await savePaymentMethod(uid, "mpesa");
        setStep("paymentContact");
        return;
      }

      if (step === "consent") {
        await finishDivinoOnboarding(uid, true);
        setStep("complete");
        onComplete();
      }
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    if (
      step === "birthDate" ||
      step === "birthPlace" ||
      step === "paymentContact"
    ) {
      setAnswer("");
      const next: Record<string, OnboardingStep> = {
        birthDate: "birthPlace",
        birthPlace: "paymentMethod",
        paymentContact: "consent",
      };
      setStep(next[step]);
    }
  }

  if (step === "complete") {
    return (
      <div className="divino-onboarding">
        <h2>👑 Bem-vindo à Connected King</h2>
        <p>O seu perfil está preparado. Agora pode explorar a rede.</p>
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div className="divino-onboarding">
        <div className="divino-avatar">👑</div>
        <h2>Olá! Eu sou o DIVINO IA.</h2>
        <p>
          Sou o assistente da Connected King. Vou ajudá-lo a preparar o seu
          perfil para começar a utilizar a rede. Só lhe vou perguntar o
          necessário — o que preferir não partilhar, pode saltar.
        </p>
        <button onClick={submit} disabled={loading}>
          Vamos começar
        </button>
      </div>
    );
  }

  if (step === "paymentMethod") {
    return (
      <div className="divino-onboarding">
        <h2>Como pretende receber pagamentos?</h2>
        <p>Poderá configurar ou alterar isto mais tarde.</p>
        <div className="payment-options">
          {(
            [
              ["mpesa", "M-Pesa"],
              ["emola", "e-Mola"],
              ["mkesh", "mKesh"],
              ["bank", "Banco"],
              ["paypal", "PayPal"],
            ] as [PaymentMethod, string][]
          ).map(([value, label]) => (
            <button
              key={value as string}
              onClick={async () => {
                await savePaymentMethod(uid, value);
                setStep("paymentContact");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "consent") {
    return (
      <div className="divino-onboarding">
        <h2>Memória do DIVINO</h2>
        <p>
          Posso guardar algumas informações do seu perfil para tornar as
          próximas conversas mais úteis. Nunca guardo dados de pagamento
          (cartão, CVV ou PIN) — apenas o identificador do sistema de
          pagamentos, se o fornecer. Pode apagar tudo depois.
        </p>
        <button
          onClick={async () => {
            await finishDivinoOnboarding(uid, true);
            setStep("complete");
            onComplete();
          }}
        >
          Permitir e entrar
        </button>
        <button
          onClick={async () => {
            await finishDivinoOnboarding(uid, false);
            setStep("complete");
            onComplete();
          }}
        >
          Continuar sem memória
        </button>
      </div>
    );
  }

  const question = QUESTIONS[step as keyof typeof QUESTIONS];

  return (
    <div className="divino-onboarding">
      <div className="divino-avatar">👑</div>
      <h2>DIVINO IA</h2>
      <p>{question}</p>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Escreva aqui..."
        autoFocus
      />
      <button onClick={submit} disabled={loading}>
        {loading ? "A processar..." : "Continuar"}
      </button>
      {step !== "fullName" && (
        <button onClick={skip}>Fazer depois</button>
      )}
    </div>
  );
}
