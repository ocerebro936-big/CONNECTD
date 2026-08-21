import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { UploadKind } from './upload-engine';

// ============================================================================
// Connected Cloud Storage — Registo de ficheiros (backend real)
// ----------------------------------------------------------------------------
// Cada ficheiro enviado para a Connected passa a ter um documento próprio em
// Firestore (a "asset"). Isto garante que o que aparece na interface existe
// realmente no backend: com identificador, proprietário, permissões, tamanho,
// formato, data e estado de processamento.
// ============================================================================

export type AssetVisibility = 'public' | 'followers' | 'private';
export type ProcessingState =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'draft'
  | 'published'
  | 'failed';

export interface CloudAsset {
  id?: string;
  ownerUid: string;
  ownerName: string;
  ownerHandle?: string;
  ownerAvatar?: string;
  // Tipo de conteúdo (foto, vídeo, reel, áudio, pdf, slides, document, capa, avatar…)
  kind: UploadKind | 'cover' | 'avatar' | 'tv' | 'course';
  ext: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  duration?: number;
  format?: 'vertical' | 'horizontal' | 'square';
  // Permissões de acesso ao ficheiro
  visibility: AssetVisibility;
  // Caminho no Storage e URLs
  storagePath: string;
  thumbnailPath?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  // Estado de processamento (upload → processamento → pronto/falhou)
  processingState: ProcessingState;
  uploadedBytes: number;
  totalBytes: number;
  chunkSize?: number;
  totalChunks?: number;
  uploadedChunks?: number;
  // Sessão resumable (permite retomar após interrupção/recarregamento)
  uploadSessionUri?: string;
  // SHA-256 do conteúdo (dedup: reutiliza asset se o ficheiro já existir)
  checksum?: string;
  // Referência à origem: "post:<id>", "chat:<id>", "tv:<id>", "profile:cover"…
  sourceRef?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAssetInput {
  ownerUid: string;
  ownerName: string;
  ownerHandle?: string;
  ownerAvatar?: string;
  kind: CloudAsset['kind'];
  ext: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility?: AssetVisibility;
  storagePath: string;
  thumbnailPath?: string;
  sourceRef?: string;
  checksum?: string;
  width?: number;
  height?: number;
  duration?: number;
  format?: CloudAsset['format'];
}

const ASSETS = 'cloudAssets';

// O Firestore não aceita `undefined` como valor de campo. Removemos sempre
// antes de escrever, para que nenhum `undefined` (ex.: sourceRef, thumbnailUrl,
// width, height) quebre o setDoc/updateDoc.
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export async function createCloudAsset(input: CreateAssetInput): Promise<string> {
  const ref = doc(collection(db, ASSETS));
  const now = Date.now();
  const asset: CloudAsset = {
    ...input,
    id: ref.id,
    visibility: input.visibility ?? 'public',
    processingState: 'pending',
    uploadedBytes: 0,
    totalBytes: input.sizeBytes,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, removeUndefined(asset as unknown as Record<string, any>));
  return ref.id;
}

export async function updateCloudAsset(id: string, patch: Partial<CloudAsset>): Promise<void> {
  await updateDoc(doc(db, ASSETS, id), removeUndefined({ ...patch, updatedAt: Date.now() } as unknown as Record<string, any>));
}

export async function patchCloudAsset(
  id: string,
  patch: Partial<CloudAsset>
): Promise<void> {
  await updateCloudAsset(id, patch);
}

export async function getCloudAsset(id: string): Promise<CloudAsset | null> {
  const snap = await getDoc(doc(db, ASSETS, id));
  if (!snap.exists()) return null;
  return snap.data() as CloudAsset;
}

export async function listUserAssets(
  uid: string,
  max = 50
): Promise<CloudAsset[]> {
  const q = query(
    collection(db, ASSETS),
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc'),
    qLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CloudAsset);
}

export async function setAssetReady(
  id: string,
  patch: Partial<CloudAsset> = {}
): Promise<void> {
  await updateCloudAsset(id, { ...patch, processingState: 'ready' });
}

export async function setAssetFailed(id: string): Promise<void> {
  await updateCloudAsset(id, { processingState: 'failed' });
}

export async function setAssetUploading(
  id: string,
  sessionUri?: string
): Promise<void> {
  const patch: Partial<CloudAsset> = { processingState: 'uploading' };
  if (sessionUri) patch.uploadSessionUri = sessionUri;
  await updateCloudAsset(id, patch);
}

export async function setAssetProcessing(id: string): Promise<void> {
  await updateCloudAsset(id, { processingState: 'processing' });
}

export async function setAssetDraft(id: string): Promise<void> {
  await updateCloudAsset(id, { processingState: 'draft' });
}

export async function setAssetPublished(id: string): Promise<void> {
  await updateCloudAsset(id, { processingState: 'published' });
}

export async function findAssetByChecksum(
  ownerUid: string,
  checksum: string
): Promise<CloudAsset | null> {
  if (!checksum) return null;
  const q = query(
    collection(db, ASSETS),
    where('ownerUid', '==', ownerUid),
    where('checksum', '==', checksum),
    qLimit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as CloudAsset;
}

// Timestamp do servidor (usado para auditoria consistente)
export function cloudNow(): number {
  return Date.now();
}

export { serverTimestamp };
