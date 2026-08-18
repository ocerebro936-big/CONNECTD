// ============================================================================
// Connected Cloud Storage — Metadados de mídia (cliente)
// Lê dimensões/duração sem depender de Firebase. Usa APIs do browser.
// ============================================================================

export interface MediaMeta {
  kind: 'image' | 'video' | 'audio' | 'other';
  width?: number;
  height?: number;
  duration?: number;
}

export function readMediaMeta(file: File): Promise<MediaMeta> {
  if (file.type.startsWith('image/')) return probeImage(file);
  if (file.type.startsWith('video/')) return probeVideo(file);
  if (file.type.startsWith('audio/')) return probeAudio(file);
  return Promise.resolve({ kind: 'other' });
}

function probeImage(file: File): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        kind: 'image',
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ kind: 'image' });
    };
    img.src = url;
  });
}

function probeVideo(file: File): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        kind: 'video',
        width: v.videoWidth,
        height: v.videoHeight,
        duration: Math.round(v.duration || 0),
      });
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ kind: 'video' });
    };
    v.src = url;
  });
}

function probeAudio(file: File): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ kind: 'audio', duration: Math.round(a.duration || 0) });
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ kind: 'audio' });
    };
    a.src = url;
  });
}
