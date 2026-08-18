// ============================================================================
// Connected Cloud Core — Download Engine
// ----------------------------------------------------------------------------
// Devolve URL temporária/segura. Nunca expomos o caminho físico; o acesso é
// filtrado pelo Access Guard antes de libertar a URL.
// ============================================================================
import { ref, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { canAccess } from './access-guard';

export async function getUrl(key: string): Promise<string> {
  return getDownloadURL(ref(storage, key));
}

export async function getUrlGuarded(key: string, assetId: string, viewer: any): Promise<string> {
  const snap = await getDoc(doc(db, 'cloudAssets', assetId));
  if (!snap.exists()) throw new Error('ASSET_NOT_FOUND');
  const data = snap.data() as any;
  if (!canAccess('view', { ownerId: data.ownerUid, visibility: data.visibility }, viewer)) {
    throw new Error('ACCESS_DENIED');
  }
  return getDownloadURL(ref(storage, key));
}
