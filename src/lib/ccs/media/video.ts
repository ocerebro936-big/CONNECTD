// ============================================================================
// Connected Cloud Storage — Processamento de vídeo
// Gera thumbnail (frame) a partir do primeiro segundo do vídeo usando <video>
// + <canvas>. A transcodificação para 1080p/720p/480p é feita server-side
// (worker CON-MEDIA) quando disponível; aqui apenas o thumbnail de prévia.
// ============================================================================

export async function generateVideoThumbnail(
  file: Blob,
  atSeconds = 1
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(atSeconds, (video.duration || 2) / 2);
      } catch {
        video.currentTime = 0;
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 270;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (b) => {
            cleanup();
            resolve(b);
          },
          'image/jpeg',
          0.8
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}
