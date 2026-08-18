// ============================================================================
// Connected Cloud Core — Access Guard (Permission Guard)
// ----------------------------------------------------------------------------
// Cada acesso passa por WHO? -> WHAT? -> RESOURCE? -> ACTION? -> ALLOWED?
// Esta é a validação client-side (UX/short-circuit); a autorização real vive
// nas Firestore/Storage rules. O DIVINO, por exemplo, não tem acesso livre.
// ============================================================================
export type StorageAction = 'upload' | 'view' | 'delete';

export interface StorageResourceMeta {
  ownerId: string;
  visibility: 'private' | 'public';
}

export function isAdmin(viewer: any): boolean {
  return viewer?.role === 'admin' || viewer?.uid === 'ADMIN_UID';
}

export function canAccess(action: StorageAction, resource: StorageResourceMeta, viewer: any | null): boolean {
  const authed = !!viewer?.uid;
  if (action === 'upload') return authed;
  if (action === 'delete') return authed && (resource.ownerId === viewer.uid || isAdmin(viewer));
  if (action === 'view') {
    if (resource.visibility === 'public') return true;
    if (!authed) return false;
    return resource.ownerId === viewer.uid || isAdmin(viewer);
  }
  return false;
}
