// ============================================================================
// Connected Cloud Core — Image Engine (client-side)
// ----------------------------------------------------------------------------
// Gera thumbnail/preview Web a partir de uma imagem enviada, via Canvas.
// O original fica protegido; a versão pública é disponibilizada conforme permissões.
// ============================================================================
export async function generateThumbnail(file: File, max = 512): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.8);
}
