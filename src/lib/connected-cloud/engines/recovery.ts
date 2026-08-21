import type { BackupEngine } from "./backup";

export interface RecoveryEngine {
  recover(
    assetId: string,
    ownerId: string,
  ): Promise<Uint8Array | null>;
  lastError(): string | null;
}

// Motor de Recovery: restaura o objeto a partir do backup mais recente.
// Estabelece o contrato para recuperação de falhas (upload interrompido,
// corrupção, perda de nó).
export class BackupRecoveryEngine
  implements RecoveryEngine {

  private error: string | null = null;

  constructor(
    private readonly backup: BackupEngine,
  ) {}

  async recover(
    assetId: string,
    _ownerId: string,
  ): Promise<Uint8Array | null> {
    try {
      const ids = await this.backup.list(assetId);

      if (!ids.length) {
        this.error = "no-backup";
        return null;
      }

      const data = await this.backup.restore(
        ids[ids.length - 1],
      );

      return data;
    } catch (e: any) {
      this.error = String(e?.message || e);
      return null;
    }
  }

  lastError() {
    return this.error;
  }
}
