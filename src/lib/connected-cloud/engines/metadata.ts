export interface MetadataRecord {
  key: string;
  ownerId: string;
  values: Record<string, string>;
  updatedAt: string;
}

export interface MetadataEngine {
  get(key: string): Promise<Record<string, string> | null>;
  set(
    key: string,
    ownerId: string,
    values: Record<string, string>,
  ): Promise<void>;
}

export class MemoryMetadataEngine
  implements MetadataEngine {

  private store =
    new Map<string, MetadataRecord>();

  async get(key: string) {
    return this.store.get(key)?.values ?? null;
  }

  async set(
    key: string,
    ownerId: string,
    values: Record<string, string>,
  ) {
    this.store.set(key, {
      key,
      ownerId,
      values,
      updatedAt: new Date().toISOString(),
    });
  }
}
