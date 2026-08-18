// ============================================================================
// Connected Cloud Storage — Processamento de imagem
// Gera derivados inteligentes (large/medium/small/thumbnail) para utilização
// rápida no Feed, mantendo o original quando o plano de armazenamento permite.
// ============================================================================

export interface ImageDerivative {
  label: 'original' | 'large' | 'medium' | 'small' | 'thumbnail';
  width: number;
  blob: Blob;
}

function widthToLabel(w: number): ImageDerivative['label'] {
  if (w >= 1600) return 'large';
  if (w >= 1080) return 'medium';
  if (w >= 600) return 'small';
  return 'thumbnail';
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
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
 * Gera derivados redimensionados de uma imagem. O original (label 'original')
 * é sempre incluído. Larguras padrão: 1600/1080/600/200.
 */
export async function generateImageDerivatives(
  file: File,
  widths: number[] = [1600, 1080, 600, 200]
): Promise<ImageDerivative[]> {
  const img = await loadImage(file);
  const out: ImageDerivative[] = [];
  const seen = new Set<ImageDerivative['label']>();

  for (const w of widths) {
    if (img.width <= w) continue;
    const scale = w / img.width;
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, w, h);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, type);
    const label = widthToLabel(w);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, width: w, blob });
  }

  URL.revokeObjectURL(img.src);
  out.push({ label: 'original', width: img.width, blob: file });
  return out;
}
