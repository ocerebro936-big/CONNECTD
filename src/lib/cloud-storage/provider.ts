// ============================================================================
// Connected Cloud Core — Connected Storage
// ----------------------------------------------------------------------------
// ÚNICO caminho oficial de mídia da Connected King. NÃO existe Firebase
// Storage, nem fallback silencioso. O disco físico é o Connected Cloud Node,
// acessado através do Connected Cloud Gateway (servidor de objetos real).
//
// Se o Gateway estiver indisponível, o erro é explícito — o upload é
// preservado no lado do cliente e retomado, em vez de fingir sucesso.
// ============================================================================
import { ConnectedStorage } from "./connected-storage-class";

const GATEWAY =
  (import.meta.env.VITE_CCS_GATEWAY_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:8787";

export interface StorageObjectMeta {
  ownerId: string;
  mimeType: string;
  visibility: "private" | "public";
  checksum?: string;
  size: number;
}

export interface StorageProvider {
  put(
    key: string,
    data: Blob | ArrayBuffer,
    meta: StorageObjectMeta,
    onProgress?: (fraction: number) => void,
  ): Promise<string>; // devolve URL do objeto
  get(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  metadata?(key: string): Promise<{
    size: number;
    contentType: string;
    updated: number;
    etag?: string;
  }>;
  signedUrl?(key: string, opts?: { expiresInSeconds?: number }): Promise<string>;
}

export interface StorageObject {
  id: string;
  ownerId: string;
  key: string;
  mimeType: string;
  size: number;
  checksum: string;
  visibility: "private" | "public";
}

const CHUNK = 1024 * 1024; // 1 MB

async function toBytes(data: Blob | ArrayBuffer): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(await data.arrayBuffer());
}

async function apiJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body?.error || `CCS_GATEWAY_${res.status}`);
  }
  return body;
}

/** Provider que fala com o Connected Cloud Gateway (objeto real). */
export class ConnectedCloudProvider implements StorageProvider {
  private base: string;
  constructor(base: string = GATEWAY) {
    this.base = base.replace(/\/+$/, "");
  }

  async put(
    key: string,
    data: Blob | ArrayBuffer,
    meta: StorageObjectMeta,
    onProgress?: (fraction: number) => void,
  ): Promise<string> {
    const bytes = await toBytes(data);
    if (bytes.byteLength !== meta.size) {
      throw new Error("STORAGE_SIZE_MISMATCH");
    }
    const total = Math.max(1, Math.ceil(bytes.byteLength / CHUNK));

    const session = await apiJson(`${this.base}/v1/upload/init`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key,
        ownerId: meta.ownerId,
        mimeType: meta.mimeType,
        visibility: meta.visibility,
        checksum: meta.checksum,
        totalChunks: total,
      }),
    });

    for (let i = 0; i < total; i++) {
      const chunk = bytes.subarray(i * CHUNK, Math.min((i + 1) * CHUNK, bytes.byteLength));
      const res = await fetch(`${this.base}/v1/upload/${session.sessionId}/${i}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body: chunk,
      });
      if (!res.ok) throw new Error("CCS_UPLOAD_CHUNK_FAILED");
      onProgress?.((i + 1) / total);
    }

    const done = await apiJson(`${this.base}/v1/upload/${session.sessionId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checksum: meta.checksum }),
    });

    return `${this.base}/v1/assets/${encodeURIComponent(done.key || key)}`;
  }

  async get(key: string): Promise<ArrayBuffer> {
    const res = await fetch(`${this.base}/v1/assets/${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error("CCS_OBJECT_NOT_FOUND");
    return await res.arrayBuffer();
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(`${this.base}/v1/assets/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("CCS_DELETE_FAILED");
  }

  async exists(key: string): Promise<boolean> {
    const res = await fetch(`${this.base}/v1/assets/${encodeURIComponent(key)}`, {
      method: "HEAD",
    });
    return res.ok;
  }

  async metadata(key: string) {
    const res = await fetch(`${this.base}/v1/assets/${encodeURIComponent(key)}`, {
      method: "HEAD",
    });
    if (!res.ok) throw new Error("CCS_OBJECT_NOT_FOUND");
    return {
      size: Number(res.headers.get("content-length") || 0),
      contentType: res.headers.get("content-type") || "",
      updated: Number(res.headers.get("x-ccs-updated") || Date.now()),
      etag: res.headers.get("etag") || undefined,
    };
  }

  async signedUrl(key: string): Promise<string> {
    return `${this.base}/v1/assets/${encodeURIComponent(key)}`;
  }
}

// A app fala APENAS com connectedStorage (Connected Cloud Gateway).
export const connectedStorage = new ConnectedStorage(new ConnectedCloudProvider());

export { ConnectedStorage } from "./connected-storage-class";
export { createStorageProvider } from "./create-provider";
