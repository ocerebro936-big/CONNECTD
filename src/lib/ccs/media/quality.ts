// ============================================================================
// Connected Cloud Storage — Qualidade adaptativa
// Decide a compressão conforme o tipo e tamanho do ficheiro de entrada.
// ============================================================================

export function pickQuality(sizeBytes: number, mimeType?: string): number {
  if (mimeType === 'image/png') return 0.92; // PNG: prioriza fidelidade
  if (sizeBytes > 8 * 1024 * 1024) return 0.7;
  if (sizeBytes > 3 * 1024 * 1024) return 0.8;
  return 0.85;
}

/** Decide se vale a pena gerar derivados para poupar largura de banda. */
export function shouldGenerateDerivatives(sizeBytes: number, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/') && sizeBytes > 300 * 1024) return true;
  return sizeBytes > 1024 * 1024;
}
