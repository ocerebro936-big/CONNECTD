export interface BackupSnapshot {
  snapshotId: string;
  assetId: string;
  ownerId: string;
  size: number;
  takenAt: string;
  data: Uint8Array;
}

export interface BackupEngine {
  snapshot(
    assetId: string,
    ownerId: string,
    data: Uint8Array,
  ): Promise<string>;
  restore(snapshotId: string): Promise<Uint8Array | null>;
  list(assetId: string): Promise<string[]>;
}

// Motor de Backup (em memória): guarda cópias do objeto original. Num nó
// Connected isto apontará para armazenamento redundante/geograficamente
// distribuído.
export class MemoryBackupEngine
  implements BackupEngine {

  private snapshots =
    new Map<string, BackupSnapshot>();

  async snapshot(
    assetId: string,
    ownerId: string,
    data: Uint8Array,
  ): Promise<string> {
    const id = crypto.randomUUID();

    this.snapshots.set(id, {
      snapshotId: id,
      assetId,
      ownerId,
      size: data.byteLength,
      takenAt: new Date().toISOString(),
      data,
    });

    return id;
  }

  async restore(snapshotId: string) {
    return this.snapshots.get(snapshotId)?.data ?? null;
  }

  async list(assetId: string) {
    return Array.from(this.snapshots.values())
      .filter((s) => s.assetId === assetId)
      .map((s) => s.snapshotId);
  }
}
