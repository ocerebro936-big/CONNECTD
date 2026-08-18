// ============================================================================
// Connected Cloud Storage — Retomada de upload (resume)
// Persiste metadados de sessão para que, após queda de rede ou fecho da
// página, o envio possa ser continuado em vez de reiniciado do zero.
// O disco físico (Firebase/S3/MEGA/Connected Storage) retoma do último byte
// recebido quando o upload é refeito para a mesma chave.
// ============================================================================

export interface UploadSession {
  assetId: string;
  key: string;
  checksum: string;
  fileName: string;
  size: number;
  folder: string;
  createdAt: number;
}

const PREFIX = 'ccs_session_';

export function saveUploadSession(s: UploadSession): void {
  try {
    localStorage.setItem(PREFIX + s.assetId, JSON.stringify(s));
  } catch {
    /* ignorado */
  }
}

export function loadUploadSession(assetId: string): UploadSession | null {
  try {
    const raw = localStorage.getItem(PREFIX + assetId);
    return raw ? (JSON.parse(raw) as UploadSession) : null;
  } catch {
    return null;
  }
}

export function clearUploadSession(assetId: string): void {
  try {
    localStorage.removeItem(PREFIX + assetId);
  } catch {
    /* ignorado */
  }
}

export function pendingSessions(): UploadSession[] {
  const out: UploadSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const v = localStorage.getItem(k);
        if (v) out.push(JSON.parse(v) as UploadSession);
      }
    }
  } catch {
    /* ignorado */
  }
  return out;
}
