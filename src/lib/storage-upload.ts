// ============================================================================
// Connected Cloud Core — Upload Engine (resumível)
// ----------------------------------------------------------------------------
// Upload de ficheiros para o Firebase Storage com:
//  - chunked/resumable (retoma após queda de ligação)
//  - progresso em tempo real
//  - pause / resume
//  - registo de metadados em cloudAssets (estado do processamento)
// Precisa do Firebase Storage ativo no projeto para funcionar em produção.
// ============================================================================
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage, db } from '../firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export interface ResumableUploadOptions {
  path: string; // ex: music/{uid}/{id}/audio
  file: File;
  ownerUid: string;
  visibility?: 'public' | 'private';
  mimeType?: string;
  checksum?: string;
  onProgress?: (pct: number, task: UploadTask) => void;
}

export interface ResumableUploadHandle {
  task: UploadTask;
  promise: Promise<string>; // resolve com a downloadURL
  pause: () => void;
  resume: () => void;
}

export function uploadResumable(opts: ResumableUploadOptions): ResumableUploadHandle {
  const storageRef = ref(storage, opts.path);
  const task = uploadBytesResumable(storageRef, opts.file, {
    contentType: opts.mimeType || opts.file.type,
    customMetadata: { ownerUid: opts.ownerUid },
  });

  const assetPromise = addDoc(collection(db, 'cloudAssets'), {
    ownerUid: opts.ownerUid,
    storageKey: opts.path,
    mimeType: opts.file.type,
    size: opts.file.size,
    checksum: opts.checksum,
    visibility: opts.visibility || 'public',
    processingState: 'uploading',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  let resolveUrl!: (u: string) => void;
  let rejectUrl!: (e: any) => void;
  const promise = new Promise<string>((res, rej) => {
    resolveUrl = res;
    rejectUrl = rej;
  });

  task.on(
    'state_changed',
    (snap) => {
      const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
      opts.onProgress?.(pct, task);
    },
    async (error) => {
      try {
        const a = await assetPromise;
        await updateDoc(doc(db, 'cloudAssets', a.id), { processingState: 'failed', updatedAt: serverTimestamp() });
      } catch {
        /* ignore */
      }
      rejectUrl(error);
    },
    async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      try {
        const a = await assetPromise;
        await updateDoc(doc(db, 'cloudAssets', a.id), {
          processingState: 'ready',
          downloadUrl: url,
          updatedAt: serverTimestamp(),
        });
      } catch {
        /* ignore */
      }
      resolveUrl(url);
    }
  );

  return {
    task,
    promise,
    pause: () => task.pause(),
    resume: () => task.resume(),
  };
}
