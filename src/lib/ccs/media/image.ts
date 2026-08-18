// ============================================================================
// Connected Cloud Storage — Processamento de imagem
// Gera derivados inteligentes (large/medium/small/thumbnail) para utilização
// rápida no Feed, preservando a proporção e só fazendo downscale. Mantém o
// original (label 'original'). A qualidade é adaptativa ao tamanho do ficheiro.
// ============================================================================
import { computeImageTargets, type DimensionTarget } from './dimensions';
import { pickQuality } from './quality';

export interface ImageDerivative {
  label: 'original' | 'large' | 'medium' | 'small' | 'thumbnail';
  width: number;
  blob: Blob;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob falhou'))),
      type,
      quality
    );
  });
}

/**
 * Gera derivados redimensionados de uma imagem com base nas dimensões reais
 * (computeImageTargets) e qualidade adaptativa. O original é sempre incluído.
 */
export async function generateImageDerivatives(file: File): Promise<ImageDerivative[]> {
  const img = await loadImage(file);
  const targets: DimensionTarget[] = computeImageTargets(img.naturalWidth, img.naturalHeight);
  const quality = pickQuality(file.size, file.type);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  const out: ImageDerivative[] = [];
  for (const t of targets) {
    const canvas = document.createElement('canvas');
    canvas.width = t.width;
    canvas.height = t.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, t.width, t.height);
    const blob = await canvasToBlob(canvas, type, quality);
    out.push({ label: t.label, width: t.width, blob });
  }

  URL.revokeObjectURL(img.src);
  out.push({ label: 'original', width: img.naturalWidth, blob: file });
  return out;
}
