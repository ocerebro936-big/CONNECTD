import type { StorageObject, StorageObjectMeta, StorageProvider } from "./provider";

// API própria da Connected — não depende do fornecedor concreto.
export class ConnectedStorage {
  private _provider: StorageProvider;
  constructor(provider: StorageProvider) {
    this._provider = provider;
  }

  /** Permite trocar o fornecedor em runtime (ex.: Gateway de outro node). */
  use(provider: StorageProvider) {
    this._provider = provider;
  }

  get provider(): StorageProvider {
    return this._provider;
  }

  async upload(
    object: StorageObject,
    data: Blob | ArrayBuffer,
    onProgress?: (fraction: number) => void,
  ): Promise<{ success: boolean; fileId: string; url: string }> {
    if (data instanceof ArrayBuffer && object.size !== data.byteLength) {
      throw new Error("STORAGE_SIZE_MISMATCH");
    }
    const url = await this.provider.put(
      object.key,
      data,
      {
        ownerId: object.ownerId,
        mimeType: object.mimeType,
        visibility: object.visibility,
        checksum: object.checksum,
        size: object.size,
      } as StorageObjectMeta,
      onProgress,
    );
    return { success: true, fileId: object.id, url };
  }

  get(key: string) {
    return this.provider.get(key);
  }

  remove(key: string) {
    return this.provider.delete(key);
  }

  exists(key: string) {
    return this.provider.exists(key);
  }

  metadata(key: string) {
    return this.provider.metadata
      ? this.provider.metadata(key)
      : Promise.reject(new Error("provider não suporta metadata"));
  }

  signedUrl(key: string, opts?: { expiresInSeconds?: number }) {
    return this.provider.signedUrl
      ? this.provider.signedUrl(key, opts)
      : Promise.reject(new Error("provider não suporta signedUrl"));
  }
}
