// ============================================================================
// Connected Cloud Core — Connected Storage (provider-agnóstico)
// ----------------------------------------------------------------------------
// A Connected controla regras, organização, quotas e acessos. O disco físico
// pode estar em qualquer Cloud (Firebase Storage, S3, GCS, servidor próprio).
// Esta camada isola o fornecedor atrás de uma interface comum.
// ============================================================================
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getBytes,
  getMetadata,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../../firebase';
import { MegaStorageProvider } from './mega-provider';
import type { MegaProviderConfig } from './mega-provider';
import { S3StorageProvider } from './s3-provider';
import type { S3ProviderConfig } from './s3-provider';

export interface StorageObjectMeta {
  ownerId: string;
  mimeType: string;
  visibility: 'private' | 'public';
  checksum?: string;
  size: number;
}

export interface StorageObjectMeta {
  ownerId: string;
  mimeType: string;
  visibility: 'private' | 'public';
  checksum?: string;
  size: number;
}

export interface StorageProvider {
  put(
    key: string,
    data: Blob | ArrayBuffer,
    meta: StorageObjectMeta,
    onProgress?: (fraction: number) => void
  ): Promise<string>; // devolve downloadURL
  get(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  metadata?(key: string): Promise<{
    size: number;
    contentType: string;
    updated: number;
    etag?: string;
  }>;
  signedUrl?(key: string, opts?: { expiresInSeconds?: number }): Promise<string>;
}

/** Provider concreto: Firebase Cloud Storage (upload em chunks resumíveis). */
export class FirebaseStorageProvider implements StorageProvider {
  async put(
    key: string,
    data: Blob | ArrayBuffer,
    meta: StorageObjectMeta,
    onProgress?: (fraction: number) => void
  ): Promise<string> {
    const storageRef = ref(storage, key);
    const task = uploadBytesResumable(storageRef, data, {
      contentType: meta.mimeType,
      customMetadata: { ownerId: meta.ownerId, visibility: meta.visibility, checksum: meta.checksum || '' },
    });
    return new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) onProgress(snap.bytesTransferred / snap.totalBytes);
        },
        (e) => reject(e),
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  }

  async get(key: string): Promise<ArrayBuffer> {
    return getBytes(ref(storage, key));
  }

  async delete(key: string): Promise<void> {
    await deleteObject(ref(storage, key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await getBytes(ref(storage, key));
      return true;
    } catch {
      return false;
    }
  }

  async metadata(key: string): Promise<{ size: number; contentType: string; updated: number; etag?: string }> {
    const m = await getMetadata(ref(storage, key));
    return {
      size: m.size,
      contentType: m.contentType || '',
      updated: Date.parse(m.updated),
      etag: (m as any).etag,
    };
  }

  async signedUrl(key: string, opts?: { expiresInSeconds?: number }): Promise<string> {
    // Firebase: a downloadURL já é um URL assinado de longa duração.
    // Para expiração curta, seria necessário um token customizado (server-side).
    void opts;
    return getDownloadURL(ref(storage, key));
  }
}

export interface StorageObject {
  id: string;
  ownerId: string;
  key: string;
  mimeType: string;
  size: number;
  checksum: string;
  visibility: 'private' | 'public';
}

/** API própria da Connected — não depende do fornecedor concreto. */
export class ConnectedStorage {
  constructor(private provider: StorageProvider) {}

  async upload(
    object: StorageObject,
    data: Blob | ArrayBuffer,
    onProgress?: (fraction: number) => void
  ): Promise<{ success: boolean; fileId: string; url: string }> {
    if (data instanceof ArrayBuffer && object.size !== data.byteLength) {
      throw new Error('STORAGE_SIZE_MISMATCH');
    }
    const url = await this.provider.put(
      object.key,
      data,
      {
        ownerId: object.ownerId,
        mimeType: object.mimeType,
        visibility: object.visibility,
        checksum: object.checksum,
        size: object.size,
      },
      onProgress
    );
    return { success: true, fileId: object.id, url };
  }

  get(key: string) {
    return this.provider.get(key);
  }

  remove(key: string) {
    return this.provider.delete(key);
  }

  exists(key: string) {
    return this.provider.exists(key);
  }

  metadata(key: string) {
    return this.provider.metadata ? this.provider.metadata(key) : Promise.reject(new Error('provider não suporta metadata'));
  }

  signedUrl(key: string, opts?: { expiresInSeconds?: number }) {
    return this.provider.signedUrl
      ? this.provider.signedUrl(key, opts)
      : Promise.reject(new Error('provider não suporta signedUrl'));
  }
}

export const connectedStorage = new ConnectedStorage(new FirebaseStorageProvider());

export { MegaStorageProvider } from './mega-provider';
export type { MegaProviderConfig } from './mega-provider';
export { S3StorageProvider } from './s3-provider';
export type { S3ProviderConfig } from './s3-provider';

/** Cria um StorageProvider conforme o fornecedor pretendido (agnóstico). */
export function createStorageProvider(
  kind: 'firebase' | 'mega' | 's3',
  cfg?: MegaProviderConfig | S3ProviderConfig
): StorageProvider {
  if (kind === 'mega') {
    if (!isMega(cfg)) throw new Error('MEGA provider requer MegaProviderConfig (bridgeUrl + getIdToken).');
    return new MegaStorageProvider(cfg);
  }
  if (kind === 's3') {
    if (!isS3(cfg)) throw new Error('S3 provider requer S3ProviderConfig (presignUrl + cdnBase + getIdToken).');
    return new S3StorageProvider(cfg);
  }
  return new FirebaseStorageProvider();
}

function isMega(c: unknown): c is MegaProviderConfig {
  return !!c && typeof (c as MegaProviderConfig).bridgeUrl === 'string';
}
function isS3(c: unknown): c is S3ProviderConfig {
  return !!c && typeof (c as S3ProviderConfig).presignUrl === 'string';
}
