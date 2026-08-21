export interface TrafficRecord {
  ownerId: string;
  bytes: number;
  count: number;
  windowStart: number;
}

export interface TrafficMeter {
  record(
    ownerId: string,
    bytes: number,
  ): Promise<void>;
  getUsage(
    ownerId: string,
  ): Promise<{ bytes: number; count: number }>;
}

// Medidor de tráfego (custo de upload/download por utilizador). Em memória;
// num nó Connected isto alimentaria a Treasury (plataforma ganha com tráfego).
export class MemoryTrafficMeter
  implements TrafficMeter {

  private usage =
    new Map<string, TrafficRecord>();

  private readonly windowMs =
    24 * 60 * 60 * 1000;

  async record(
    ownerId: string,
    bytes: number,
  ) {
    const now = Date.now();
    const record = this.usage.get(ownerId);

    if (!record || now - record.windowStart > this.windowMs) {
      this.usage.set(ownerId, {
        ownerId,
        bytes,
        count: 1,
        windowStart: now,
      });
      return;
    }

    record.bytes += bytes;
    record.count += 1;
  }

  async getUsage(ownerId: string) {
    const record = this.usage.get(ownerId);

    if (!record) {
      return { bytes: 0, count: 0 };
    }

    if (
      Date.now() - record.windowStart > this.windowMs
    ) {
      this.usage.delete(ownerId);
      return { bytes: 0, count: 0 };
    }

    return { bytes: record.bytes, count: record.count };
  }
}
