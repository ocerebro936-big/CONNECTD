// ============================================================================
// Connected King Cloud — upload helper (CCS)
// ----------------------------------------------------------------------------
// Ponto único de upload para a Connected Cloud Storage. Constrói a chave
// canónica via ccsUserKey/ccsPostKey, verifica quota (CCS-Billing), calcula
// checksum (CCS-Security), envia pelo StorageProvider ativo e regista o asset
// (cloudAssets). A app nunca escreve caminhos soltos — tudo passa por aqui.
// ============================================================================
import { connectedStorage } from '../cloud-storage/provider';
import { checkQuota } from '../cloud-storage/quota-engine';
import { fileChecksum } from '../cloud-storage/checksum';
import { ccsUserKey, ccsPostKey, CcsVisibility } from './index';
import { createCloudAsset, setAssetReady } from '../connected-cloud';
import type { UploadKind } from '../upload-engine';

export type CcsFolder = 'avatar' | 'photos' | 'videos' | 'audio' | 'documents';

function safeExt(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
}

export interface CcsUploadInput {
  ownerUid: string;
  ownerName: string;
  file: File;
  folder: CcsFolder;
  kind: UploadKind | 'avatar' | 'cover' | 'tv' | 'course';
  visibility?: CcsVisibility;
  /** Se definido, usa ccsPostKey (posts/reels) em vez de users/{uid}/{folder}. */
  postId?: string;
  /** Asset já criado (para retomar upload). Se omitido, gera-se um id. */
  assetId?: string;
  user?: any;
  profileData?: any;
  onProgress?: (fraction: number) => void;
}

export interface CcsUploadResult {
  url: string;
  assetId: string;
  key: string;
}

export async function uploadToCcs(input: CcsUploadInput): Promise<CcsUploadResult> {
  const { ownerUid, file, folder } = input;

  if (input.user && input.profileData) {
    const q = await checkQuota(ownerUid, file.size, input.user, input.profileData);
    if (!q.ok) {
      throw new Error(`Quota de armazenamento Connected Cloud esgotada (${q.tier}). Libera espaço ou faz upgrade.`);
    }
  }

  const ext = safeExt(file.name);
  const assetId = input.assetId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = input.postId
    ? ccsPostKey(input.postId, `${assetId}.${ext}`)
    : ccsUserKey(ownerUid, folder, `${assetId}.${ext}`);

  const checksum = await fileChecksum(file);
  const res = await connectedStorage.upload(
    {
      id: assetId,
      ownerId: ownerUid,
      key,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      checksum,
      visibility: input.visibility === 'public' ? 'public' : 'private',
    },
    file
  );

  const id = await createCloudAsset({
    ownerUid,
    ownerName: input.ownerName,
    kind: input.kind,
    ext,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    visibility: (input.visibility || 'public') as any,
    storagePath: key,
    sourceRef: input.postId ? `post:${input.postId}` : undefined,
  });
  await setAssetReady(id, { downloadUrl: res.url });

  return { url: res.url, assetId: id, key };
}

/** Mapeia o tipo de conteúdo para a pasta CCS (users/{uid}/{folder}). */
export function ccsFolderForKind(kind: string): CcsFolder {
  switch (kind) {
    case 'avatar':
      return 'avatar';
    case 'photo':
    case 'cover':
      return 'photos';
    case 'video':
    case 'reel':
      return 'videos';
    case 'audio':
      return 'audio';
    default:
      return 'documents';
  }
}
