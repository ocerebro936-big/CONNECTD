export interface PutObjectOptions {
  contentType: string;

  checksum?: string;

  metadata?: Record<string, string>;
}

export interface ObjectInfo {
  key: string;

  size: number;

  contentType: string;

  checksum?: string;

  metadata?: Record<string, string>;
}

export interface ConnectedObjectStore {
  put(
    key: string,
    data: Uint8Array,
    options: PutObjectOptions,
  ): Promise<ObjectInfo>;

  get(key: string): Promise<Uint8Array | null>;

  head(key: string): Promise<ObjectInfo | null>;

  exists(key: string): Promise<boolean>;

  delete(key: string): Promise<void>;
}

export class MemoryObjectStore
  implements ConnectedObjectStore {

  private objects =
    new Map<
      string,
      { data: Uint8Array; info: ObjectInfo }
    >();

  async put(
    key: string,
    data: Uint8Array,
    options: PutObjectOptions,
  ): Promise<ObjectInfo> {
    const info: ObjectInfo = {
      key,
      size: data.byteLength,
      contentType: options.contentType,
      checksum: options.checksum,
      metadata: options.metadata,
    };

    this.objects.set(key, { data, info });

    return info;
  }

  async get(key: string) {
    return this.objects.get(key)?.data ?? null;
  }

  async head(key: string) {
    return this.objects.get(key)?.info ?? null;
  }

  async exists(key: string) {
    return this.objects.has(key);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}
