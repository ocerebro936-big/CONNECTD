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
