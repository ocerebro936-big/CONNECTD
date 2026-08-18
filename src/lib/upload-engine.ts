import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { compressImage } from './image-utils';
import { publishToCloud } from './cloud-upload';

export type UploadKind = 'photo' | 'video' | 'reel' | 'audio' | 'pdf' | 'slides' | 'document';

export interface ClassifiedFile {
  kind: UploadKind;
  ext: string;
  file: File;
}

export interface ProbedMedia {
  width?: number;
  height?: number;
  duration?: number;
  format?: 'vertical' | 'horizontal' | 'square';
}

const MAX_SIZE: Record<UploadKind, number> = {
  photo: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  reel: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  slides: 50 * 1024 * 1024,
  document: 50 * 1024 * 1024,
};

const MB = (n: number) => Math.round(n / 1024 / 1024);

export function classifyFile(file: File): ClassifiedFile {
  const name = file.name.toLowerCase();
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isSlides = /\.(ppt|pptx|key)$/.test(name);

  let kind: UploadKind | null = null;
  let ext = '';
  if (isImage) {
    kind = 'photo';
    ext = name.match(/\.(jpe?g|png|webp|gif|heic|heif|avif)$/)?.[0] || '.jpg';
  } else if (isVideo) {
    kind = 'video';
    ext = name.match(/\.(mp4|webm|mov|m4v)$/)?.[1] || 'mp4';
  } else if (isAudio) {
    kind = 'audio';
    ext = name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/)?.[1] || 'mp3';
  } else if (isPdf) {
    kind = 'pdf';
    ext = 'pdf';
  } else if (isSlides) {
    kind = 'slides';
    ext = name.split('.').pop() || 'ppt';
  } else if (/\.(txt|doc|docx|xls|xlsx|csv|odt|zip|rar|7z)$/.test(name)) {
    kind = 'document';
    ext = name.split('.').pop() || 'txt';
  }

  if (!kind) {
    throw new Error('Formato não suportado. Suportado: fotos, vídeos, áudio (MP3/WAV/M4A/OGG), PDF, apresentações (PPT/PPTX/KEY) e documentos (TXT/DOC/XLS/CSV/ZIP).');
  }

  const limit = MAX_SIZE[kind];
  if (file.size > limit) {
    const label = kind === 'photo' ? 'fotos' : kind === 'video' || kind === 'reel' ? 'vídeos' : 'ficheiros';
    throw new Error(`Ficheiro demasiado grande (${MB(file.size)} MB). Máximo para ${label}: ${MB(limit)} MB.`);
  }
  return { kind, ext, file };
}

export function probeMedia(file: File): Promise<ProbedMedia> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        resolve({ width: w, height: h, format: w > h * 1.1 ? 'horizontal' : h > w * 1.1 ? 'vertical' : 'square' });
      };
      img.onerror = () => resolve({});
      img.src = url;
      return;
    }
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const w = video.videoWidth;
        const h = video.videoHeight;
        resolve({ width: w, height: h, duration: Math.round(video.duration || 0), format: w > h * 1.1 ? 'horizontal' : h > w * 1.1 ? 'vertical' : 'square' });
      };
      video.onerror = () => resolve({});
      video.src = url;
      return;
    }
    resolve({});
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function generateVideoThumb(file: File, seekSeconds = 1): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve(null);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
    };

    const onTimeout = () => {
      cleanup();
      resolve(null);
    };
    const timer = window.setTimeout(onTimeout, 8000);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekSeconds, Math.max(0.1, (video.duration || 1) / 2));
    };
    video.onseeked = () => {
      try {
        const maxW = 480;
        const scale = Math.min(1, maxW / video.videoWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          window.clearTimeout(timer);
          cleanup();
          resolve(blob);
        }, 'image/jpeg', 0.72);
      } catch {
        window.clearTimeout(timer);
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

export async function resumableUpload(
  file: File,
  storagePath: string,
  onProgress?: (fraction: number) => void,
  maxRetries = 3
): Promise<string> {
  const attempt = (): Promise<string> => {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: { uploadedAt: String(Date.now()) },
    });
    return new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => onProgress?.(snap.bytesTransferred / snap.totalBytes),
        (err) => reject(err),
() => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
      );
    });
  };

  let lastError: any = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attempt();
    } catch (err: any) {
      lastError = err;
      if (i === maxRetries || err?.name === 'FirebaseError' && err?.code === 'storage/unauthorized') {
        break;
      }
      await sleep(1200 * (i + 1));
    }
  }
  throw new Error(`O upload falhou${lastError?.code === 'storage/unauthorized' ? ' (sem autorização)' : ' após várias tentativas'}. Tenta novamente.`);
}

export interface PublishMediaInput {
  user: any;
  profileData: any;
  file: File;
  content?: string;
  onProgress?: (fraction: number) => void;
  forceKind?: 'reel';
}

export interface PublishedPost {
  id: string;
  mediaType: string;
  url: string;
}

export async function publishMediaPost(input: PublishMediaInput): Promise<PublishedPost> {
  // Delegação para o Connected Cloud Storage (upload em partes + retomada +
  // registo real do asset no backend). Mantém a API anterior da app.
  const result = await publishToCloud({
    user: input.user,
    profileData: input.profileData,
    file: input.file,
    content: input.content,
    onProgress: input.onProgress,
    forceKind: input.forceKind,
  });
  return { id: result.id, mediaType: result.mediaType, url: result.url };
}