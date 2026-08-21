// Memória semântica: recuperação por sobreposição de tokens (sem embeddings
// externos). Substitui a abordagem de "decorar tudo" por relevância real.
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9áéíóúâêôãõç]+/i)
    .filter((t) => t.length > 1);
}

export function relevanceScore(
  queryTokens: string[],
  entryTokens: string[],
): number {
  if (!queryTokens.length || !entryTokens.length) return 0;
  const set = new Set(entryTokens);
  let hits = 0;
  for (const t of queryTokens) {
    if (set.has(t)) hits++;
  }
  // Jaccard simples
  const union = new Set([...queryTokens, ...entryTokens]).size;
  return union ? hits / union : 0;
}
