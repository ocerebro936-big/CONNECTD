// ============================================================================
// Connected Media Upload Engine — facade única para o utilizador
// ----------------------------------------------------------------------------
// Consolida o que já existe (CCS ccsUpload, publishCcsMediaPost, sessões de
// resume, Media Engine) numa API simples de duas fases e resiliente:
//   Fase 1 (upload):  connectedMedia.upload(file)  -> { assetId, url, kind }
//       • valida formato/tamanho/dimensão/duração ANTES de enviar
//       • faz dedup por checksum (reutiliza asset se já existir)
//       • retoma sessão se o navegador fechou ou a ligação caiu
//       • asset fica como "draft" (pronto) até o utilizador publicar
//   Fase 2 (publish): connectedMedia.publish({...}) -> cria o Post
// O asset NUNCA é apagado automaticamente se uma etapa falha (fica "failed").
// ============================================================================
import { ccsUpload, ccsFolderForKind } from '../ccs/upload/uploader';
import { publishCcsMediaPost } from '../cloud-upload';
import {
  pendingSessions,
  saveResumeTask,
  matchResumeTask,
  clearResumeTask,
  type UploadSession,
} from '../ccs/upload/resume';
import { readMediaMeta, type MediaMeta } from '../ccs/media/metadata';
import { validateMediaFile } from '../ccs/upload/validate';
import { fileChecksum } from '../cloud-storage/checksum';
import {
  findAssetByChecksum,
  setAssetDraft,
  setAssetPublished,
} from '../cloud-assets';
import { awardPoints } from '../economy/engine';
import { recordUsage } from '../economy/traffic';
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
  | 'resumed'
  | 'error';

export interface UploadMediaOptions {
  user: any;
  profileData: any;
  visibility?: 'public' | 'followers' | 'private';
  onProgress?: (fraction: number) => void;
  onPhase?: (phase: UploadPhase) => void;
  onNotice?: (text: string) => void;
}

export interface UploadMediaResult {
  assetId: string;
  url: string;
  thumbnailUrl?: string | null;
  kind: MediaKind;
  file: File;
  meta: MediaMeta;
  reused?: boolean;
}

export async function uploadMedia(
  file: File,
  opts: UploadMediaOptions
): Promise<UploadMediaResult> {
  const kind = classifyKind(file);

  // 1) Validação pré-upload (formato, tamanho, dimensão, duração)
  opts.onPhase?.('verifying');
  const validation = await validateMediaFile(file, kind);
  if (!validation.ok) {
    const msg = `Não foi possível enviar:\n• ${validation.errors.join('\n• ')}`;
    const err: any = new Error(msg);
    err.details = validation;
    throw err;
  }
  if (validation.suggestions.length) {
    opts.onNotice?.(
      `Recomendamos antes de publicar:\n• ${validation.suggestions.join('\n• ')}`
    );
  }

  const meta = validation.meta || (await readMediaMeta(file).catch(() => ({}) as MediaMeta));
  const checksum = await fileChecksum(file);

  // 2) Dedup por checksum: se o utilizador já enviou este ficheiro, reutiliza.
  try {
    const existing = await findAssetByChecksum(opts.user.uid, checksum);
    if (existing && ['ready', 'draft', 'published'].includes(existing.processingState)) {
      return {
        assetId: existing.id!,
        url: existing.downloadUrl || '',
        thumbnailUrl: existing.thumbnailUrl,
        kind,
        file,
        meta,
        reused: true,
      };
    }
  } catch {
    /* query pode falhar sem índice; ignoramos e seguimos com upload normal */
  }

  // 3) Retomada: se havia tarefa pendente (navegador fechou / ligação caiu),
  //    reutilizamos o mesmo assetId para continuar para a mesma chave.
  const resume = matchResumeTask(file.name, file.size, checksum);
  const assetId = resume?.assetId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (resume) opts.onPhase?.('resumed');

  const task: UploadSession = {
    assetId,
    key: '',
    checksum,
    fileName: file.name,
    size: file.size,
    folder: ccsFolderForKind(kind),
    createdAt: Date.now(),
  };
  saveResumeTask(task);

  let lastFraction = 0;
  const res: CcsUploadResult = await ccsUpload({
    ownerUid: opts.user.uid,
    user: opts.user,
    profileData: opts.profileData,
    file,
    folder: ccsFolderForKind(kind),
    kind,
    assetId,
    visibility: (opts.visibility || 'public') as any,
    onProgress: (f: number) => {
      if (f > 0 && lastFraction === 0) opts.onPhase?.('uploading');
      lastFraction = f;
      opts.onProgress?.(f);
    },
  });

  clearResumeTask(assetId);
  // 4) O asset está armazenado mas ainda NÃO é um Post: marca como "draft".
  try {
    await setAssetDraft(res.assetId);
  } catch {
    /* estado opcional */
  }

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
  // O asset deixa de ser "draft" e passa a "published".
  try {
    await setAssetPublished(opts.assetId);
  } catch {
    /* estado opcional */
  }
  // Prémio de pontos por publicação legítima (com dedupe por assetId).
  try {
    await awardPoints(opts.user.uid, 'publish', { ref: `post:${opts.assetId}` });
  } catch {
    /* pontos opcionais */
  }
  // Regista o custo de tráfego desta publicação na plataforma (Connected Cloud Cost).
  try {
    await recordUsage({ userId: opts.user.uid, assetId: opts.assetId, uploadBytes: opts.file?.size || 0 });
  } catch {
    /* métrica opcional */
  }
}

export function getUploadQueue(): UploadSession[] {
  return pendingSessions();
}

export const connectedMedia = {
  upload: uploadMedia,
  publish: publishMedia,
  getQueue: getUploadQueue,
};
