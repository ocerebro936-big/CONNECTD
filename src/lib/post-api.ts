// ============================================================================
// Connected Cloud Core — Post API (com soft delete + janela de recuperação)
// ----------------------------------------------------------------------------
// PUBLICAR -> ACTIVE. Apagar -> DELETED (recuperável). Após a janela, o
// Cleanup Engine faz permanent delete. Assim o utilizador nunca perde tudo.
// ============================================================================
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export const RECOVERY_WINDOW_DAYS = 30;

export async function softDeletePost(postId: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    status: 'deleted',
    deletedAt: serverTimestamp(),
  });
}

export async function restorePost(postId: string): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    status: 'active',
    deletedAt: null,
  });
}

export async function permanentDeletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

/** True se a publicação ainda está na janela de recuperação. */
export function withinRecoveryWindow(deletedAt: any): boolean {
  if (!deletedAt) return false;
  const ts = deletedAt?.toMillis ? deletedAt.toMillis() : new Date(deletedAt).getTime();
  if (!ts) return false;
  return Date.now() - ts < RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
