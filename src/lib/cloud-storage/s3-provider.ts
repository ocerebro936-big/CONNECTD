// ============================================================================
// Connected King Cloud — S3-compatible Storage Provider (CCS)
// ----------------------------------------------------------------------------
// Implementa a mesma interface StorageProvider, mas contra um object storage
// S3-compatible. O browser NÃO guarda credenciais AWS: pede URLs assinadas
// (CCS-Security) a um bridge server-side (Cloud Function `ccsPresign`) e usa
// essas URLs para PUT/GET/DELETE. A app continua a falar "Connected Cloud API";
// a infraestrutura física (S3/GCS/R2/MinIO) é trocável.
// ============================================================================
import type { StorageProvider, StorageObjectMeta } from './provider';

export interface S3ProviderConfig {
  /** Endpoint do bridge que devolve presigned URLs (Cloud Function ccsPresign). */
  presignUrl: string;
  /** Base URL pública dos objetos (ex.: https://cdn.connectedking.web.app). */
  cdnBase: string;
  /** Devolve o ID token Firebase do utilizador para autenticar o bridge. */
  getIdToken: () => Promise<string>;
}

export class S3StorageProvider implements StorageProvider {
  constructor(private cfg: S3ProviderConfig) {}

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.cfg.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async presign(key: string, method: 'PUT' | 'GET' | 'DELETE', meta?: StorageObjectMeta): Promise<string> {
    const res = await fetch(this.cfg.presignUrl, {
      method: 'POST',
      headers: { ...(await this.authHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        method,
        mime: meta?.mimeType,
        visibility: meta?.visibility,
        size: meta?.size,
      }),
    });
    if (!res.ok) throw new Error(`CCS_PRESIGN_FAILED ${res.status}`);
    const json = (await res.json()) as { url: string };
    return json.url;
  }

  async put(key: string, data: Blob | ArrayBuffer, meta: StorageObjectMeta): Promise<string> {
    const url = await this.presign(key, 'PUT', meta);
    const body = data instanceof Blob ? data : new Blob([data], { type: meta.mimeType });
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': meta.mimeType },
      body,
    });
    if (!res.ok) throw new Error(`CCS_UPLOAD_FAILED ${res.status}`);
    // Objetos públicos ficam acessíveis via CDN; privados exigem URL assinada GET.
    return `${this.cfg.cdnBase.replace(/\/$/, '')}/${key}`;
  }

  async get(key: string): Promise<ArrayBuffer> {
    const url = await this.presign(key, 'GET');
    const res = await fetch(url);
    if (!res.ok) throw new Error('CCS_GET_FAILED');
    return res.arrayBuffer();
  }

  async delete(key: string): Promise<void> {
    const url = await this.presign(key, 'DELETE');
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('CCS_DELETE_FAILED');
  }

  async exists(key: string): Promise<boolean> {
    try {
      const url = await this.presign(key, 'GET');
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }
}
