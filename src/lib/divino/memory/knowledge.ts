// Memória de conhecimento — base interna da Connected King + aprendizagem.
import { KNOWLEDGE_BASE, searchKnowledge, type KnowledgeItem } from '../../divino-core';

export const knowledge = {
  search(query: string): KnowledgeItem | null {
    return searchKnowledge(query);
  },
  all(): KnowledgeItem[] {
    return KNOWLEDGE_BASE;
  },
  byCategory(cat: string): KnowledgeItem[] {
    return KNOWLEDGE_BASE.filter((k) => k.category === cat);
  },
};
