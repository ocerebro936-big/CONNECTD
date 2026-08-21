// ============================================================================
// Connected Media Upload Engine — facade única para o utilizador
// ----------------------------------------------------------------------------
// Consolida o que já existe (CCS ccsUpload, publishCcsMediaPost, sessões de
// resume, Media Engine) numa API simples de duas fases:
//   Fase 1 (upload):  connectedMedia.upload(file)  -> { assetId, url, kind }
//   Fase 2 (publish): connectedMedia.publish({...}) -> cria o Post
// O asset fica como "draft" (pronto) até o utilizador publicar, e a sessão de
// upload é persistida para recuperação (resume) caso a aba feche.
// ============================================================================
import { ccsUpload, ccsFolderForKind } from '../ccs/upload/uploader';
import { publishCcsMediaPost } from '../cloud-upload';
import { pendingSessions, type UploadSession } from '../ccs/upload/resume';
import { readMediaMeta, type MediaMeta } from '../ccs/media/metadata';
import type { CcsUploadResult } from '../ccs/upload/types';

export type MediaKind = 'photo' | 'video' | 'audio' | 'document';

export function classifyKind(file: File): MediaKind {
  const t = file.type.toLowerCase();
  if (t.startsWith('image/')) return 'photo';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'document';
}

export type UploadPhase =
  | 'verifying'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

export interface UploadMediaOptions {
  user: any;
  profileData: any;
  visibility?: 'public' | 'followers' | 'private';
  onProgress?: (fraction: number) => void;
  onPhase?: (phase: UploadPhase) => void;
}

export interface UploadMediaResult {
  assetId: string;
  url: string;
  thumbnailUrl?: string | null;
  kind: MediaKind;
  file: File;
  meta: MediaMeta;
}

export async function uploadMedia(
  file: File,
  opts: UploadMediaOptions
): Promise<UploadMediaResult> {
  const kind = classifyKind(file);
  opts.onPhase?.('verifying');
  const meta = await readMediaMeta(file).catch(() => ({}) as MediaMeta);

  let lastFraction = 0;
  const res: CcsUploadResult = await ccsUpload({
    ownerUid: opts.user.uid,
    user: opts.user,
    profileData: opts.profileData,
    file,
    folder: ccsFolderForKind(kind),
    kind,
    visibility: (opts.visibility || 'public') as any,
    onProgress: (f: number) => {
      if (f > 0 && lastFraction === 0) opts.onPhase?.('uploading');
      lastFraction = f;
      opts.onProgress?.(f);
    },
  });

  return {
    assetId: res.assetId,
    url: res.url,
    thumbnailUrl: (res as any).thumbnailUrl,
    kind,
    file,
    meta,
  };
}

export interface PublishMediaOptions {
  assetId: string;
  url: string;
  kind: MediaKind;
  file: File;
  user: any;
  profileData: any;
  content?: string;
  visibility?: 'public' | 'followers' | 'private';
}

export async function publishMedia(opts: PublishMediaOptions): Promise<void> {
  await publishCcsMediaPost({
    user: opts.user,
    profileData: opts.profileData,
    file: opts.file,
    url: opts.url,
    assetId: opts.assetId,
    kind: opts.kind,
    content: opts.content,
  });
}

export function getUploadQueue(): UploadSession[] {
  return pendingSessions();
}

export const connectedMedia = {
  upload: uploadMedia,
  publish: publishMedia,
  getQueue: getUploadQueue,
};
