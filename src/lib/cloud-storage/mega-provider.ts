// ============================================================================
// Connected Cloud Core — MEGA Storage Provider (delegado)
// ----------------------------------------------------------------------------
// O MEGA exige credenciais de conta e operações criptográficas pesadas. Por
// segurança, as credenciais NUNCA ficam no browser: o cliente delega para um
// bridge server-side (Cloud Function `megaBridge`, topologia CON-WORKER) que
// executa as operações com o SDK `megajs`. O cliente mantém a mesma interface
// StorageProvider — a Connected continua agnóstica ao fornecedor.
// ============================================================================
import type { StorageProvider, StorageObjectMeta } from './provider';

export interface MegaProviderConfig {
  /** URL da Cloud Function `megaBridge` (ex.: https://...cloudfunctions.net/megaBridge). */
  bridgeUrl: string;
  /** Devolve o ID token Firebase do utilizador para autenticar o bridge. */
  getIdToken: () => Promise<string>;
}

export class MegaStorageProvider implements StorageProvider {
  constructor(private cfg: MegaProviderConfig) {}

  private async authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await this.cfg.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      ...extra,
    };
  }

  async put(key: string, data: Blob | ArrayBuffer, meta: StorageObjectMeta): Promise<string> {
    const body = data instanceof Blob ? data : new Blob([data]);
    const res = await fetch(`${this.cfg.bridgeUrl}/upload?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: await this.authHeaders({
        'x-mime': meta.mimeType,
        'x-owner': meta.ownerId,
        'x-visibility': meta.visibility,
        'x-checksum': meta.checksum || '',
      }),
      body,
    });
    if (!res.ok) throw new Error(`MEGA_UPLOAD_FAILED ${res.status}`);
    const json = (await res.json()) as { url: string };
    return json.url;
  }

  async get(key: string): Promise<ArrayBuffer> {
    const res = await fetch(`${this.cfg.bridgeUrl}/download?key=${encodeURIComponent(key)}`, {
      headers: await this.authHeaders(),
    });
    if (!res.ok) throw new Error('MEGA_GET_FAILED');
    return res.arrayBuffer();
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(`${this.cfg.bridgeUrl}/delete`, {
      method: 'POST',
      headers: await this.authHeaders(),
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw new Error('MEGA_DELETE_FAILED');
  }

  async exists(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.cfg.bridgeUrl}/exists?key=${encodeURIComponent(key)}`, {
        headers: await this.authHeaders(),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { exists: boolean };
      return json.exists;
    } catch {
      return false;
    }
  }
}
