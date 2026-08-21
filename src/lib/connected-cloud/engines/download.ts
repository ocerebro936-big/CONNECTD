import type { ConnectedObjectStore } from "../storage/object-store";

export interface DownloadResult {
  data: Uint8Array | null;
}

export interface DownloadHead {
  key: string;
  size: number;
  contentType: string;
  checksum?: string;
  metadata?: Record<string, string>;
}

export interface DownloadEngine {
  get(key: string): Promise<Uint8Array | null>;
  head(key: string): Promise<DownloadHead | null>;
}

export class ConnectedDownloadEngine
  implements DownloadEngine {

  constructor(
    private readonly store: ConnectedObjectStore,
  ) {}

  async get(key: string) {
    return this.store.get(key);
  }

  async head(key: string) {
    const info = await this.store.head(key);

    if (!info) {
      return null;
    }

    return {
      key: info.key,
      size: info.size,
      contentType: info.contentType,
      checksum: info.checksum,
      metadata: info.metadata,
    };
  }
}
