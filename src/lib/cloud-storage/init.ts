// ============================================================================
// Connected Storage Infrastructure — inicialização do provider CCS
// ----------------------------------------------------------------------------
// A Connected Cloud Storage arranca com Firebase (default dev). Em produção,
// se as env vars VITE_CCS_PRESIGN_URL + VITE_CCS_CDN_BASE estiverem definidas,
// o disco físico passa a ser um S3-compatible (AWS/R2), mantendo a mesma API
// da app. As credenciais AWS NUNCA saem do servidor (Cloud Function ccsPresign).
// ============================================================================
import { getAuth } from 'firebase/auth';
import { connectedStorage, S3StorageProvider } from './provider';
import type { StorageProvider } from './provider';

export function initConnectedStorage(): StorageProvider {
  const presignUrl = (import.meta.env.VITE_CCS_PRESIGN_URL as string | undefined)?.trim();
  const cdnBase = (import.meta.env.VITE_CCS_CDN_BASE as string | undefined)?.trim();

  if (presignUrl && cdnBase) {
    const s3 = new S3StorageProvider({
      presignUrl,
      cdnBase,
      getIdToken: async () => {
        const user = getAuth().currentUser;
        if (!user) throw new Error('CCS: utilizador não autenticado');
        return user.getIdToken();
      },
    });
    connectedStorage.use(s3);
    // eslint-disable-next-line no-console
    console.info('[Connected Cloud] Storage provider ativo: S3-compatible');
    return s3;
  }

  // eslint-disable-next-line no-console
  console.info('[Connected Cloud] Storage provider ativo: Firebase (default)');
  return connectedStorage.provider;
}
