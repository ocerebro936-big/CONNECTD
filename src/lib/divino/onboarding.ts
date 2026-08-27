// ============================================================================
// DIVINO — Onboarding Cognitivo
// ----------------------------------------------------------------------------
// Regra fundamental de privacidade:
//   • O DIVINO PERGUNTA e EXPLICA; o utilizador DECIDE o que fornece.
//   • Data/local de nascimento e dados de pagamento são OPCIONAIS.
//   • Nunca guardamos cartão, CVV, PIN ou password. Apenas o identificador/
//     token fornecido pelo sistema de pagamentos (ex.: número M-Pesa).
//   • Nada é recolhido "apenas para alimentar a IA".
// O fluxo usa o DivinoBrain.think() (intent/context/memory/reasoning) — NUNCA
// correspondência por palavra-chave — e o consentimento alimenta o MemoryManager.
// ============================================================================
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../firebase";
import { memoryManager } from "./memory/memory-manager";

export type OnboardingStep =
  | "welcome"
  | "fullName"
  | "birthDate"
  | "birthPlace"
  | "paymentMethod"
  | "paymentContact"
  | "consent"
  | "complete";

export type PaymentMethod =
  | "mpesa"
  | "emola"
  | "mkesh"
  | "bank"
  | "paypal"
  | "other"
  | null;

export interface DivinoProfile {
  uid: string;

  fullName?: string;

  // Dados opcionais.
  birthDate?: string;
  birthPlace?: string;

  paymentMethod?: PaymentMethod;

  // Nunca guardar cartão, CVV, PIN ou password.
  paymentContact?: string;

  consentToMemory: boolean;

  completed: boolean;

  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OnboardingState {
  step: OnboardingStep;
  profile: Partial<DivinoProfile>;
}

const INITIAL_STATE: OnboardingState = {
  step: "welcome",
  profile: {
    consentToMemory: false,
    completed: false,
  },
};

export async function getDivinoOnboarding(
  uid: string
): Promise<OnboardingState> {
  const ref = doc(db, "divinoProfiles", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return INITIAL_STATE;
  }

  const data = snapshot.data() as DivinoProfile;

  if (data.completed) {
    return {
      step: "complete",
      profile: data,
    };
  }

  return {
    step: "welcome",
    profile: data,
  };
}

export async function saveDivinoAnswer(
  uid: string,
  step: OnboardingStep,
  answer: string
): Promise<OnboardingState> {
  const ref = doc(db, "divinoProfiles", uid);

  const updates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };

  switch (step) {
    case "fullName":
      updates.fullName = answer.trim();
      break;

    case "birthDate":
      // Opcional: guardamos apenas se o utilizador escreveu algo.
      if (answer.trim()) updates.birthDate = answer.trim();
      break;

    case "birthPlace":
      if (answer.trim()) updates.birthPlace = answer.trim();
      break;

    case "paymentContact":
      // Apenas o identificador do sistema de pagamentos (ex.: número M-Pesa).
      if (answer.trim()) updates.paymentContact = answer.trim();
      break;

    default:
      break;
  }

  await setDoc(ref, updates, { merge: true });

  const nextStep = getNextStep(step);

  return {
    step: nextStep,
    profile: updates as Partial<DivinoProfile>,
  };
}

export async function savePaymentMethod(
  uid: string,
  method: PaymentMethod
) {
  if (!method) {
    throw new Error("Método de pagamento inválido.");
  }

  await setDoc(
    doc(db, "divinoProfiles", uid),
    {
      paymentMethod: method,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function finishDivinoOnboarding(
  uid: string,
  consentToMemory: boolean
) {
  await setDoc(
    doc(db, "divinoProfiles", uid),
    {
      consentToMemory,
      completed: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Liga o consentimento à memória cognitiva do DIVINO (MemoryManager).
  await memoryManager.setConsent(uid, consentToMemory);
}

function getNextStep(step: OnboardingStep): OnboardingStep {
  switch (step) {
    case "welcome":
      return "fullName";

    case "fullName":
      return "birthDate";

    case "birthDate":
      return "birthPlace";

    case "birthPlace":
      return "paymentMethod";

    case "paymentMethod":
      return "paymentContact";

    case "paymentContact":
      return "consent";

    case "consent":
      return "complete";

    default:
      return "complete";
  }
}
