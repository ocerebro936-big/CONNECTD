// ============================================================================
// Connected Cloud Core — Video Engine (client-side)
// ----------------------------------------------------------------------------
// Extrai thumbnail + duração de um vídeo enviado, via <video> + Canvas.
// O original fica protegido; a versão pública (thumbnail/streaming) é gerada.
// ============================================================================
export async function generateVideoThumbnail(file: File, max = 512): Promise<{ thumbnail: string; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.preload = 'metadata';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('video inválido'));
  });

  const duration = Math.round(video.duration || 0);
  video.currentTime = Math.min(1, Math.max(0.1, duration / 2));

  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.max(1, Math.round(video.videoWidth * scale));
  const h = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.drawImage(video, 0, 0, w, h);
  URL.revokeObjectURL(url);

  return { thumbnail: canvas.toDataURL('image/jpeg', 0.8), duration };
}
