// ============================================================================
// Connected Cloud Storage — Dimensões inteligentes
// Calcula os derivados necessários preservando a proporção (só faz downscale).
// O Feed escolhe o derivado conforme a largura disponível / qualidade de rede.
// ============================================================================

export interface DimensionTarget {
  label: 'original' | 'large' | 'medium' | 'small' | 'thumbnail';
  width: number;
  height: number;
}

export const IMAGE_PRESETS: { label: Exclude<DimensionTarget['label'], 'original'>; width: number }[] = [
  { label: 'large', width: 1920 },
  { label: 'medium', width: 1280 },
  { label: 'small', width: 640 },
  { label: 'thumbnail', width: 320 },
];

export const VIDEO_PRESETS = [
  { label: '1080p', width: 1920, height: 1080 },
  { label: '720p', width: 1280, height: 720 },
  { label: '480p', width: 854, height: 480 },
] as const;

export function computeImageTargets(
  width: number,
  height: number
): DimensionTarget[] {
  const out: DimensionTarget[] = [];
  for (const p of IMAGE_PRESETS) {
    if (width <= p.width) continue; // não upscaling
    const scale = p.width / width;
    const h = Math.max(1, Math.round(height * scale));
    out.push({ label: p.label, width: p.width, height: h });
  }
  return out;
}

/** Escolhe o melhor derivado de imagem para uma largura alvo (ex.: coluna do feed). */
export function pickImageDerivative(
  targets: DimensionTarget[],
  desiredWidth: number
): DimensionTarget | null {
  let best: DimensionTarget | null = null;
  for (const t of targets) {
    if (t.width >= desiredWidth) {
      if (!best || t.width < best.width) best = t;
    }
  }
  return best;
}

/** Plano de derivados de vídeo (transcode é feito server-side; client gera thumbnail/preview). */
export function videoDerivativePlan(width: number, height: number) {
  return VIDEO_PRESETS.map((p) => ({
    label: p.label,
    width: p.width,
    height: p.height,
    // só faz sentido transcodificar se o original for maior
    applicable: width >= p.width,
  }));
}
