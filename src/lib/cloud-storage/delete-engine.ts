// ============================================================================
// Connected Cloud Core — Delete Engine
// ----------------------------------------------------------------------------
// Remove o objeto do Storage e a respetiva metadata em cloudAssets. Valida
// permissão via Access Guard antes de apagar.
// ============================================================================
import { storage, db } from '../../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { canAccess } from './access-guard';

export async function deleteAsset(key: string, viewer: any): Promise<void> {
  const snap = await getDocs(query(collection(db, 'cloudAssets'), where('storageKey', '==', key)));
  if (!snap.empty) {
    const d = snap.docs[0];
    const data = d.data() as any;
    if (!canAccess('delete', { ownerId: data.ownerUid, visibility: data.visibility }, viewer)) {
      throw new Error('ACCESS_DENIED');
    }
    await deleteDoc(d.ref);
  }
  await deleteObject(ref(storage, key));
}
