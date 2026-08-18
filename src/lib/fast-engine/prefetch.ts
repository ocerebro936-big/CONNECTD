// ============================================================================
// Connected Fast Engine — Prefetch
// Aquece o cache de imagens/vídeos antes de serem visíveis (ex.: próximos
// itens do Feed ou derivados de conexão mais rápida).
// ============================================================================

export function prefetchImage(url: string): void {
  if (typeof Image === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

export function prefetchImages(urls: string[], limit = 6): void {
  urls.slice(0, limit).forEach(prefetchImage);
}

export function prefetchMedia(urls: string[]): void {
  prefetchImages(urls);
}

/**
 * Dispara o prefetch quando o utilizador se aproxima do fim da lista.
 * `nearEnd` deve ser true quando o último item está quase visível.
 */
export function prefetchNextPage(nearEnd: boolean, urls: string[]): void {
  if (nearEnd) prefetchImages(urls);
}
