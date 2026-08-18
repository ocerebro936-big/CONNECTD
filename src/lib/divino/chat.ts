// Wrapper de compatibilidade com a UI (DivinoIa). Liga o cérebro cognitivo.
import { getBrain, type DivinoBrain } from './core/cognition';
import type { DivinoCognitiveReply, DivinoRole } from './types';

export async function divinoCognitiveChat(
  messages: { role: string; text: string }[],
  opts: { uid: string; modelId: string; apiKey?: string; userName?: string; role?: DivinoRole }
): Promise<DivinoCognitiveReply> {
  const brain = getBrain(opts.uid);
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (!last) {
    return { text: 'Como posso ajudar a Connected King?', specialist: 'general-knowledge', source: 'fallback', toolsUsed: [] };
  }
  return brain.think({
    uid: opts.uid,
    name: opts.userName,
    role: opts.role ?? 'user',
    text: last.text,
    apiKey: opts.apiKey,
    modelId: opts.modelId,
  });
}

export function getDivinoBrain(uid: string): DivinoBrain {
  return getBrain(uid);
}

export async function divinoConfirm(uid: string): Promise<DivinoCognitiveReply | null> {
  return getBrain(uid).confirm();
}
