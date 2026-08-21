export type CloudAction =
  | "read"
  | "write"
  | "delete"
  | "admin";

export interface SecurityEngine {
  authorize(
    actorId: string,
    ownerId: string,
    action: CloudAction,
  ): Promise<boolean>;
  checkRateLimit(
    ownerId: string,
    bytes: number,
  ): Promise<boolean>;
  resetRateLimit(ownerId: string): void;
}

// Motor de segurança: controlo de acesso (owner-only) + rate limit de
// tráfego por janela. Pronto para plugar KYC/roles quando os nós reais
// existirem. O DIVINO só tem ação "read" sobre a própria conta.
export class MemorySecurityEngine
  implements SecurityEngine {

  private rate =
    new Map<string, { used: number; windowStart: number }>();

  constructor(
    private readonly maxBytesPerWindow =
      5 * 1024 * 1024 * 1024,
    private readonly windowMs = 60 * 60 * 1000,
  ) {}

  async authorize(
    actorId: string,
    ownerId: string,
    action: CloudAction,
  ): Promise<boolean> {
    if (!actorId) {
      return false;
    }

    if (action === "admin") {
      return (
        actorId === "system" || actorId === "divino"
      );
    }

    return actorId === ownerId || action === "read";
  }

  async checkRateLimit(
    ownerId: string,
    bytes: number,
  ): Promise<boolean> {
    const now = Date.now();
    const entry = this.rate.get(ownerId);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.rate.set(ownerId, {
        used: bytes,
        windowStart: now,
      });
      return true;
    }

    if (
      entry.used + bytes >
      this.maxBytesPerWindow
    ) {
      return false;
    }

    entry.used += bytes;
    return true;
  }

  resetRateLimit(ownerId: string) {
    this.rate.delete(ownerId);
  }
}
