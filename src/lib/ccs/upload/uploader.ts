// ============================================================================
// Connected Cloud Storage — Uploader universal (CCS-Upload)
// Pipeline único para Gallery, Camera, Feed, Profile, TV e Marketplace.
//    validate → quota → checksum → upload resiliente (chunk/retry/resume)
//             → verify → derivados (imagens) / thumbnail (vídeo) → publish
// Nenhuma dependência direta de Firebase Storage: tudo passa por connectedStorage.
// ============================================================================
import { checkQuota } from '../../cloud-storage/quota-engine';
import { ccsUserKey, ccsPostKey, type CcsVisibility } from '../../ccs';
import {
  createCloudAsset,
  setAssetReady,
  updateCloudAsset,
} from '../../cloud-assets';
import { fileChecksum } from '../../cloud-storage/checksum';
import { connectedStorage } from '../../cloud-storage/provider';
import { generateImageDerivatives } from '../media/image';
import { generateVideoThumbnail } from '../media/video';
import { uploadResumable } from './chunk-upload';
import type {
  CcsUploadInput,
  CcsUploadResult,
  CcsDerivative,
  CcsFolder,
} from './types';

function safeExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : 'bin';
}

export function ccsFolderForKind(kind: string): CcsFolder {
  if (kind === 'audio') return 'audio';
  if (kind === 'video' || kind === 'reel' || kind === 'tv') return 'videos';
  if (kind === 'document' || kind === 'pdf' || kind === 'slides') return 'documents';
  if (kind === 'avatar') return 'avatar';
  if (kind === 'cover' || kind === 'gallery') return kind as CcsFolder;
  return 'photos';
}

export async function ccsUpload(input: CcsUploadInput): Promise<CcsUploadResult> {
  const { ownerUid, file, folder } = input;
  const kind = input.kind;

  if (!file || file.size === 0) throw new Error('Ficheiro inválido ou vazio.');
  if (input.user && input.profileData) {
    const q = await checkQuota(ownerUid, file.size, input.user, input.profileData);
    if (!q.ok) {
      throw new Error(
        `Quota de armazenamento Connected Cloud esgotada (${q.tier}). Libera espaço ou faz upgrade.`
      );
    }
  }

  const ext = safeExt(file.name);
  const assetId = input.assetId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const baseKey = input.postId
    ? ccsPostKey(input.postId, `${assetId}.${ext}`)
    : ccsUserKey(ownerUid, folder, `${assetId}.${ext}`);
  const checksum = await fileChecksum(file);
  const visibility = (input.visibility || 'public') as CcsVisibility;
  const visFlag = visibility === 'public' ? 'public' : 'private';

  const session = {
    assetId,
    key: baseKey,
    checksum,
    fileName: file.name,
    size: file.size,
    folder,
    createdAt: Date.now(),
  };

  const handle = uploadResumable(
    {
      id: assetId,
      ownerId: ownerUid,
      key: baseKey,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      checksum,
      visibility: visFlag,
    },
    file,
    session,
    { onProgress: input.onProgress, signal: input.signal }
  );
  const { url } = await handle.promise;

  const id = await createCloudAsset({
    ownerUid,
    ownerName: input.ownerName,
    kind: kind as any,
    ext,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    visibility: visibility as any,
    storagePath: baseKey,
    checksum,
    sourceRef: input.postId ? `post:${input.postId}` : undefined,
  });
  await setAssetReady(id, { downloadUrl: url });

  const result: CcsUploadResult = { url, assetId: id, key: baseKey, file };

  // ---- Derivados inteligentes de imagem ----
  const wantDeriv =
    (kind === 'photo' ||
      kind === 'image' ||
      folder === 'photos' ||
      folder === 'gallery' ||
      folder === 'avatar') &&
    (input.generateDerivatives !== false) &&
    file.type.startsWith('image/');
  if (wantDeriv) {
    try {
      const derivs = await generateImageDerivatives(file);
      const derivatives: CcsDerivative[] = [];
      for (const d of derivs) {
        if (d.label === 'original') continue;
        const dExt = d.blob.type === 'image/png' ? 'png' : 'jpg';
        const dKey = input.postId
          ? ccsPostKey(input.postId, `${assetId}_${d.label}.${dExt}`)
          : ccsUserKey(ownerUid, folder, `${assetId}_${d.label}.${dExt}`);
        const dSession = {
          ...session,
          assetId: `${assetId}_${d.label}`,
          key: dKey,
          fileName: `${assetId}_${d.label}.${dExt}`,
          size: d.blob.size,
        };
        const dHandle = uploadResumable(
          {
            id: `${assetId}_${d.label}`,
            ownerId: ownerUid,
            key: dKey,
            mimeType: d.blob.type,
            size: d.blob.size,
            checksum: '',
            visibility: visFlag,
          },
          d.blob,
          dSession
        );
        const dRes = await dHandle.promise;
        derivatives.push({ label: d.label, width: d.width, url: dRes.url, sizeBytes: d.blob.size });
      }
      if (derivatives.length) {
        await updateCloudAsset(id, { derivatives } as any);
        result.derivatives = derivatives;
      }
    } catch {
      /* derivados são opcionais */
    }
  }

  // ---- Thumbnail de vídeo ----
  if (file.type.startsWith('video/')) {
    try {
      const thumb = await generateVideoThumbnail(file);
      if (thumb && thumb.size > 0) {
        const tKey = input.postId
          ? ccsPostKey(input.postId, `${assetId}_thumb.jpg`)
          : ccsUserKey(ownerUid, folder, `${assetId}_thumb.jpg`);
        const tSession = {
          ...session,
          assetId: `${assetId}_thumb`,
          key: tKey,
          fileName: `${assetId}_thumb.jpg`,
          size: thumb.size,
        };
        const tHandle = uploadResumable(
          {
            id: `${assetId}_thumb`,
            ownerId: ownerUid,
            key: tKey,
            mimeType: 'image/jpeg',
            size: thumb.size,
            checksum: '',
            visibility: visFlag,
          },
          thumb,
          tSession
        );
        const tRes = await tHandle.promise;
        await updateCloudAsset(id, { thumbnailUrl: tRes.url } as any);
        result.thumbnailUrl = tRes.url;
      }
    } catch {
      /* thumbnail opcional */
    }
  }

  return result;
}
