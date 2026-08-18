// ============================================================================
// DIVINO IA — Context Engine
// ----------------------------------------------------------------------------
// Resolve referências indiretas ("isso", "ele", "aquilo", "lá") usando a
// conversa recente, tornando a conversa mais humana e coerente.
// ============================================================================
import { shortTerm } from '../memory/short-term';

export interface ResolvedContext {
  references: string[];
  topic?: string;
  enrichedText: string;
}

export function resolveContext(userId: string, text: string): ResolvedContext {
  const recent = shortTerm.last(userId, 4);
  const refs = ['isso', 'ele', 'ela', 'aquilo', 'lá', 'mesmo'];
  const hasRef = refs.some((r) => new RegExp(`\\b${r}\\b`, 'i').test(text));
  if (!hasRef) return { references: [], enrichedText: text };

  // Tópico inferido da última mensagem do utilizador ou resposta do Divino.
  const lastUser = [...recent].reverse().find((m) => m.role === 'user');
  const lastDivino = [...recent].reverse().find((m) => m.role === 'divino');
  const topic = lastUser?.text || lastDivino?.text;

  return {
    references: refs.filter((r) => new RegExp(`\\b${r}\\b`, 'i').test(text)),
    topic,
    enrichedText: topic ? `${text} (contexto: "${topic}")` : text,
  };
}
