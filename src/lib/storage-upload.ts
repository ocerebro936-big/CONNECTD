// ============================================================================
// Connected Cloud Core — Upload Engine (resumível)
// ----------------------------------------------------------------------------
// Upload através da Connected Cloud API (connectedStorage). O disco físico
// (Firebase/S3/MEGA) faz o chunking/resumo nativo. Não há dependência direta
// do Firebase Storage na aplicação — tudo passa pelo provider abstrato.
// ============================================================================
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { connectedStorage } from './cloud-storage/provider';
import { removeUndefined } from './connected-cloud';

export interface ResumableUploadOptions {
  path: string; // ex: music/{uid}/{id}/audio
  file: File;
  ownerUid: string;
  visibility?: 'public' | 'private';
  mimeType?: string;
  checksum?: string;
  onProgress?: (pct: number) => void;
}

export interface ResumableUploadHandle {
  task: any;
  promise: Promise<string>; // resolve com a downloadURL
  pause: () => void;
  resume: () => void;
}

export function uploadResumable(opts: ResumableUploadOptions): ResumableUploadHandle {
  const assetPromise = addDoc(
    collection(db, 'cloudAssets'),
    removeUndefined({
      ownerUid: opts.ownerUid,
      storageKey: opts.path,
      mimeType: opts.file.type,
      size: opts.file.size,
      checksum: opts.checksum,
      visibility: opts.visibility || 'public',
      processingState: 'uploading',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  const controller = new AbortController();
  const promise = (async () => {
    try {
      const res = await connectedStorage.upload(
        {
          id: opts.path,
          ownerId: opts.ownerUid,
          key: opts.path,
          mimeType: opts.mimeType || opts.file.type,
          size: opts.file.size,
          checksum: opts.checksum || '',
          visibility: opts.visibility || 'public',
        },
        opts.file,
        (f) => opts.onProgress?.(Math.round(f * 100))
      );
      const a = await assetPromise;
      await updateDoc(doc(db, 'cloudAssets', a.id), {
        processingState: 'ready',
        downloadUrl: res.url,
        updatedAt: serverTimestamp(),
      });
      return res.url;
    } catch (error) {
      try {
        const a = await assetPromise;
        await updateDoc(doc(db, 'cloudAssets', a.id), {
          processingState: 'failed',
          updatedAt: serverTimestamp(),
        });
      } catch {
        /* ignore */
      }
      throw error;
    }
  })();

  return {
    task: null,
    promise,
    pause: () => controller.abort(),
    resume: () => {},
  };
}
