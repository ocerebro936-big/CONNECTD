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

// ----------------------------------------------------------------------------
// Registo de tarefa de retomada: persiste além da conclusão, para que após
// fechar o navegador/perder ligação o envio possa continuar para a mesma chave
// (assetId reutilizado) em vez de recomeçar do zero.
// ----------------------------------------------------------------------------
const RT_PREFIX = 'ccs_resume_task_';

export function saveResumeTask(s: UploadSession): void {
  try {
    localStorage.setItem(RT_PREFIX + s.assetId, JSON.stringify(s));
  } catch {
    /* ignorado */
  }
}

export function matchResumeTask(fileName: string, size: number, checksum: string): UploadSession | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(RT_PREFIX)) continue;
      const v = localStorage.getItem(k);
      if (!v) continue;
      const s = JSON.parse(v) as UploadSession;
      if (s.fileName === fileName && s.size === size && (!checksum || s.checksum === checksum)) {
        return s;
      }
    }
  } catch {
    /* ignorado */
  }
  return null;
}

export function clearResumeTask(assetId: string): void {
  try {
    localStorage.removeItem(RT_PREFIX + assetId);
  } catch {
    /* ignorado */
  }
}

