export interface AssetDeduplication {
  find(
    ownerId: string,
    checksum: string,
  ): Promise<string | null>;

  remember(
    ownerId: string,
    checksum: string,
    assetId: string,
  ): Promise<void>;
}

export class MemoryDeduplication
  implements AssetDeduplication {

  private readonly index =
    new Map<string, string>();

  async find(
    ownerId: string,
    checksum: string,
  ) {
    return (
      this.index.get(
        `${ownerId}:${checksum}`,
      ) ?? null
    );
  }

  async remember(
    ownerId: string,
    checksum: string,
    assetId: string,
  ) {
    this.index.set(
      `${ownerId}:${checksum}`,
      assetId,
    );
  }
}
