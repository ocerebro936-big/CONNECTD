import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { connectedStorage } from './cloud-storage/provider';
import {
  classifyFile,
  probeMedia,
  generateVideoThumb,
} from './upload-engine';
import { compressImage } from './image-utils';
import {
  updateCloudAsset,
  getCloudAsset,
  setAssetReady,
  setAssetUploading,
  setAssetProcessing,
  type CreateAssetInput,
  type CloudAsset,
  type AssetVisibility,
  type ProcessingState,
} from './connected-cloud';
import { ccsUserKey } from './ccs';

// ============================================================================
// Connected Upload Engine
// ----------------------------------------------------------------------------
// Upload em partes (chunked) com retomada automática após interrupção.
// Usa o protocolo "resumable upload" do Firebase Storage (Google Cloud Storage)
// para que, se a conexão cair ou a página recarregar, o envio continue do
// último byte já recebido pelo servidor — não do zero.
// ============================================================================

const STORAGE_ENDPOINT = 'https://firebasestorage.googleapis.com/v0/b';

interface ResumableHandle {
  bucket: string;
  path: string;
  contentType: string;
  size: number;
  token: string;
  sessionUri: string;
}

function uploadInitUrl(bucket: string, name: string): string {
  return `${STORAGE_ENDPOINT}/${bucket}/o?uploadType=resumable&name=${encodeURIComponent(name)}`;
}

function mediaUrl(bucket: string, path: string, token: string): string {
  return `${STORAGE_ENDPOINT}/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function authToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('Precisas de estar ligado para enviar ficheiros.');
  return u.getIdToken(true);
}

async function beginSession(
  bucket: string,
  path: string,
  contentType: string,
  size: number,
  token: string
): Promise<string> {
  const res = await fetch(uploadInitUrl(bucket, path), {
    method: 'POST',
    headers: {
      Authorization: `Firebase ${token}`,
      'X-Upload-Content-Type': contentType,
      'X-Upload-Content-Length': String(size),
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ name: path }),
  });
  if (!res.ok) throw new Error(`Falha ao iniciar o upload (${res.status}).`);
  const location = res.headers.get('Location');
  if (!location) throw new Error('O servidor não devolveu a sessão de upload.');
  return location;
}

async function extractToken(res: Response): Promise<string | undefined> {
  try {
    const data: any = await res.json();
    const t = data?.downloadTokens;
    if (typeof t === 'string' && t.length) return t.split(',')[0];
  } catch {
    /* ignora corpo não-JSON */
  }
  return undefined;
}

interface StatusResult {
  received: number;
  done: boolean;
  token?: string;
  expired?: boolean;
}

async function queryReceived(h: ResumableHandle): Promise<StatusResult> {
  const res = await fetch(h.sessionUri, {
    method: 'PUT',
    headers: {
      Authorization: `Firebase ${h.token}`,
      'Content-Range': `bytes */${h.size}`,
      'Content-Length': '0',
    },
  });
  if (res.status === 200 || res.status === 201) {
    return { received: h.size, done: true, token: await extractToken(res) };
  }
  if (res.status === 308) {
    const range = res.headers.get('Range');
    let received = 0;
    if (range) {
      const m = /bytes=0-(\d+)/.exec(range);
      if (m) received = parseInt(m[1], 10) + 1;
    }
    if (received > h.size) received = h.size;
    return { received, done: false };
  }
  if (res.status === 410) return { received: 0, done: false, expired: true };
  throw new Error(`Erro ao consultar o progresso (${res.status}).`);
}

async function putChunk(
  h: ResumableHandle,
  blob: Blob,
  start: number,
  end: number
): Promise<{ done: boolean; token?: string; expired?: boolean }> {
  const res = await fetch(h.sessionUri, {
    method: 'PUT',
    headers: {
      Authorization: `Firebase ${h.token}`,
      'Content-Type': h.contentType,
      'Content-Range': `bytes ${start}-${end}/${h.size}`,
      'Content-Length': String(end - start + 1),
    },
    body: blob,
  });
  if (res.status === 200 || res.status === 201) {
    return { done: true, token: await extractToken(res) };
  }
  if (res.status === 308) return { done: false };
  if (res.status === 410) return { done: false, expired: true };
  throw new Error(`Erro ao enviar parte do ficheiro (${res.status}).`);
}

export interface ResumableUploadOptions {
  blob: Blob;
  storagePath: string;
  contentType: string;
  chunkSize?: number;
  onProgress?: (uploaded: number, total: number) => void;
  getSession?: () => Promise<string | null | undefined>;
  saveSession?: (uri: string) => Promise<void>;
  clearSession?: () => Promise<void>;
  shouldCancel?: () => boolean;
  maxChunkRetries?: number;
}

export interface ResumableUploadResult {
  downloadUrl: string;
  size: number;
}

export async function resumableUploadFile(
  opts: ResumableUploadOptions
): Promise<ResumableUploadResult> {
  const token = await authToken();
  const bucket = firebaseConfig.storageBucket;
  const size = opts.blob.size;
  const chunkSize = opts.chunkSize ?? 4 * 1024 * 1024;
  const base = {
    bucket,
    path: opts.storagePath,
    contentType: opts.contentType,
    size,
    token,
  };

  let sessionUri = (await opts.getSession?.()) || undefined;
  let handle: ResumableHandle | null = null;
  let resumeFrom = 0;

  if (sessionUri) {
    handle = { ...base, sessionUri };
    const status = await queryReceived(handle);
    if (status.expired) {
      handle = null;
    } else if (status.done && status.token) {
      return {
        downloadUrl: mediaUrl(bucket, opts.storagePath, status.token),
        size,
      };
    } else {
      resumeFrom = status.received;
    }
  }

  if (!handle) {
    const newUri = await beginSession(
      bucket,
      opts.storagePath,
      opts.contentType,
      size,
      token
    );
    await opts.saveSession?.(newUri);
    handle = { ...base, sessionUri: newUri };
    resumeFrom = 0;
  }

  let uploaded = resumeFrom;
  const maxRetries = opts.maxChunkRetries ?? 6;

  const resync = async (): Promise<boolean> => {
    try {
      const st = await queryReceived(handle!);
      if (st.expired) {
        const newUri = await beginSession(
          bucket,
          opts.storagePath,
          opts.contentType,
          size,
          token
        );
        await opts.saveSession?.(newUri);
        handle = { ...base, sessionUri: newUri };
        uploaded = 0;
        return true;
      }
      uploaded = st.received;
    } catch {
      /* mantém a posição atual */
    }
    return false;
  };

  while (uploaded < size) {
    if (opts.shouldCancel?.()) {
      await opts.clearSession?.();
      throw new Error('Upload cancelado.');
    }
    const end = Math.min(uploaded + chunkSize, size) - 1;
    const slice = opts.blob.slice(uploaded, end + 1);

    let done = false;
    let tokenOut: string | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const r = await putChunk(handle, slice, uploaded, end);
        if (r.expired) {
          const restart = await resync();
          if (restart) break;
        }
        done = r.done;
        tokenOut = r.token;
        break;
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempt));
        await resync();
      }
    }

    if (attempt > maxRetries) {
      throw new Error('Falha ao enviar o ficheiro após várias tentativas.');
    }

    if (done) {
      const finalToken = tokenOut || (await finalizeToken(handle));
      if (!finalToken) {
        throw new Error('Ficheiro enviado, mas não foi possível obter o link.');
      }
      await opts.clearSession?.();
      return {
        downloadUrl: mediaUrl(bucket, opts.storagePath, finalToken),
        size,
      };
    }

    uploaded = end + 1;
    opts.onProgress?.(uploaded, size);
  }

  const finalStatus = await queryReceived(handle);
  if (!finalStatus.done) {
    throw new Error('O upload não foi concluído pelo servidor.');
  }
  const finalToken = finalStatus.token || (await finalizeToken(handle));
  if (!finalToken) throw new Error('Não foi possível obter o link do ficheiro.');
  await opts.clearSession?.();
  return {
    downloadUrl: mediaUrl(bucket, opts.storagePath, finalToken),
    size,
  };
}

async function finalizeToken(h: ResumableHandle): Promise<string | undefined> {
  const res = await fetch(h.sessionUri, {
    method: 'PUT',
    headers: {
      Authorization: `Firebase ${h.token}`,
      'Content-Range': `bytes */${h.size}`,
      'Content-Length': '0',
    },
  });
  if (res.status === 200 || res.status === 201) return extractToken(res);
  return undefined;
}

// ============================================================================
// Publicação na Connected Cloud
// ----------------------------------------------------------------------------
// Cria o registo do asset (backend real) ANTES do upload, envia o ficheiro por
// partes com retomada, gera miniatura (vídeos/reels), marca o estado de
// processamento e só depois cria a publicação no feed que referencia o asset.
// ============================================================================

export interface PublishCloudInput {
  user: any;
  profileData: any;
  file: File;
  content?: string;
  visibility?: AssetVisibility;
  onProgress?: (fraction: number) => void;
  onState?: (state: ProcessingState) => void;
  forceKind?: 'reel';
  sourceRef?: string;
}

export interface PublishCloudResult {
  id: string;
  assetId: string;
  mediaType: string;
  url: string;
  thumbnailUrl?: string | null;
}

export async function publishToCloud(
  input: PublishCloudInput
): Promise<PublishCloudResult> {
  const { user, profileData, file, content = '' } = input;
  const classified = classifyFile(file);
  const probe = await probeMedia(file);

  let kind: CloudAsset['kind'] = classified.kind;
  if (input.forceKind === 'reel' && kind === 'video') kind = 'reel';
  else if (kind === 'video' && probe.format === 'vertical') kind = 'reel';

  const authorName =
    profileData.displayName || user.email?.split('@')[0] || 'Unknown';
  const authorHandle = `@${authorName.toLowerCase().replace(/\s+/g, '')}`;

  // Comprime fotos inteligentemente antes do envio
  let blob: Blob = file;
  if (kind === 'photo') {
    const dataUrl = await compressImage(file, { maxDim: 1920, quality: 0.82 });
    blob = await (await fetch(dataUrl)).blob();
  }

  // Identificador de asset controlado (usado no caminho do Storage)
  const assetRef = doc(collection(db, 'cloudAssets'));
  const assetId = assetRef.id;
  // Caminho canónico CCS: users/{uid}/{photos|videos|audio|documents}/{assetId}.ext
  const ccsFolder = (kind === 'audio'
    ? 'audio'
    : kind === 'video' || kind === 'reel'
    ? 'videos'
    : kind === 'photo'
    ? 'photos'
    : 'documents') as 'audio' | 'videos' | 'photos' | 'documents';
  const storagePath = ccsUserKey(user.uid, ccsFolder, `${assetId}.${classified.ext}`);
  const thumbnailPath = ccsUserKey(user.uid, ccsFolder, `${assetId}_thumb.jpg`);

  const assetInput: CreateAssetInput = {
    ownerUid: user.uid,
    ownerName: authorName,
    ownerHandle: authorHandle,
    ownerAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
    kind,
    ext: classified.ext,
    fileName: file.name,
    mimeType: blob.type || file.type,
    sizeBytes: blob.size,
    visibility: input.visibility ?? 'public',
    storagePath,
    thumbnailPath,
    sourceRef: input.sourceRef,
    width: probe.width,
    height: probe.height,
    duration: probe.duration,
    format: probe.format,
  };

  await setDoc(assetRef, { ...assetInput, id: assetId });
  await setAssetUploading(assetId);
  input.onState?.('uploading');

  // Upload em partes com retomada automática (sessão persistida no asset)
  const result = await resumableUploadFile({
    blob,
    storagePath,
    contentType: blob.type || file.type,
    chunkSize: 4 * 1024 * 1024,
    onProgress: (up, total) => {
      input.onProgress?.(total ? up / total : 0);
      updateCloudAsset(assetId, {
        uploadedBytes: up,
        totalBytes: total,
        uploadedChunks: Math.ceil(up / (4 * 1024 * 1024)),
      }).catch(() => {});
    },
    getSession: async () =>
      (await getCloudAsset(assetId))?.uploadSessionUri || undefined,
    saveSession: async (uri) =>
      updateCloudAsset(assetId, { uploadSessionUri: uri }).catch(() => {}),
    clearSession: async () =>
      updateCloudAsset(assetId, { uploadSessionUri: '' }).catch(() => {}),
  });

  // Miniatura automática para vídeos e reels
  await setAssetProcessing(assetId);
  input.onState?.('processing');
  let thumbnailUrl: string | null = null;
  if (kind === 'video' || kind === 'reel') {
    try {
      const thumb = await generateVideoThumb(file);
      if (thumb && thumb.size > 0) {
        const tRes = await connectedStorage.upload(
          {
            id: `${assetId}_thumb`,
            ownerId: user.uid,
            key: thumbnailPath,
            mimeType: 'image/jpeg',
            size: thumb.size,
            checksum: '',
            visibility:
              (input.visibility ?? 'public') === 'public' ? 'public' : 'private',
          },
          thumb
        );
        thumbnailUrl = tRes.url;
      }
    } catch {
      thumbnailUrl = null;
    }
  }

  await setAssetReady(assetId, {
    downloadUrl: result.downloadUrl,
    thumbnailUrl: thumbnailUrl || undefined,
    uploadedBytes: blob.size,
    totalBytes: blob.size,
  });
  input.onState?.('ready');

  // Só após o asset estar pronto é que a publicação é criada
  const media: Record<string, any> = {
    type: kind,
    url: result.downloadUrl,
    fileName: file.name,
    sizeBytes: blob.size,
    cloudAssetId: assetId,
  };
  if (thumbnailUrl) media.thumbnailUrl = thumbnailUrl;
  if (kind === 'photo' && probe.width) {
    media.width = probe.width;
    media.height = probe.height;
  }
  if ((kind === 'video' || kind === 'reel') && probe.duration) {
    media.duration = probe.duration;
  }
  if (kind === 'reel') media.format = 'vertical';
  else if (probe.format) media.format = probe.format;

  let fallback = '';
  if (kind === 'audio') fallback = `🎵 Partilhou áudio: ${file.name}`;
  else if (kind === 'pdf') fallback = `📄 Partilhou documento: ${file.name}`;
  else if (kind === 'slides')
    fallback = `📊 Partilhou apresentação: ${file.name}`;
  else if (kind === 'document')
    fallback = `📦 Partilhou ficheiro: ${file.name}`;

  const postRef = await addDoc(collection(db, 'posts'), {
    userId: user.uid,
    authorName,
    authorHandle,
    authorAvatar: profileData.photoURL || 'https://github.com/shadcn.png',
    content: content.trim() || fallback,
    media,
    ratings: { totalScore: 0, count: 0, userRatings: {} },
    likes: 0,
    comments: 0,
    createdAt: Date.now(),
  });

  return {
    id: postRef.id,
    assetId,
    mediaType: kind,
    url: result.downloadUrl,
    thumbnailUrl,
  };
}

// ----------------------------------------------------------------------------
// Publica um post cujo ficheiro JÁ foi carregado para a Connected Cloud (CCS)
// via uploadToCcs — evita o re-upload. Usado pelos CcsUploader do compositor.
// ----------------------------------------------------------------------------
export async function publishCcsMediaPost(opts: {
  user: any;
  profileData: any;
  file: File;
  url: string;
  assetId: string;
  kind: any;
  content?: string;
}): Promise<void> {
  const authorName = opts.profileData.displayName || opts.user.email?.split('@')[0] || 'Unknown';
  const authorHandle = `@${authorName.toLowerCase().replace(/\s+/g, '')}`;
  let fallback = `Partilhou ${opts.file.name}`;
  const k = opts.kind;
  if (k === 'audio') fallback = `🎵 Partilhou áudio: ${opts.file.name}`;
  else if (k === 'pdf') fallback = `📄 Partilhou documento: ${opts.file.name}`;
  else if (k === 'slides') fallback = `📊 Partilhou apresentação: ${opts.file.name}`;
  else if (k === 'document') fallback = `📦 Partilhou ficheiro: ${opts.file.name}`;

  await addDoc(collection(db, 'posts'), {
    userId: opts.user.uid,
    authorName,
    authorHandle,
    authorAvatar: opts.profileData.photoURL || 'https://github.com/shadcn.png',
    content: (opts.content || '').trim() || fallback,
    media: {
      type: k,
      url: opts.url,
      fileName: opts.file.name,
      sizeBytes: opts.file.size,
      cloudAssetId: opts.assetId,
    },
    ratings: { totalScore: 0, count: 0, userRatings: {} },
    likes: 0,
    comments: 0,
    createdAt: Date.now(),
  });
}
