import type { ConnectedObjectStore } from "../storage/object-store";
import type { CloudEventLedger } from "../core/events";
import { calculateChecksum } from "../storage/checksum";
import type { CloudVisibility } from "../core/types";
import { ConnectedCloudError, CloudErrors } from "../core/errors";

export interface UploadInput {
  ownerId: string;
  key: string;
  data: Uint8Array;
  mimeType: string;
  visibility?: CloudVisibility;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  checksum: string;
  size: number;
}

export interface UploadEngine {
  upload(
    input: UploadInput,
  ): Promise<UploadResult>;
}

export class ConnectedUploadEngine
  implements UploadEngine {

  constructor(
    private readonly store: ConnectedObjectStore,
    private readonly events: CloudEventLedger,
  ) {}

  async upload(
    input: UploadInput,
  ): Promise<UploadResult> {
    if (!input.ownerId) {
      throw new ConnectedCloudError(
        CloudErrors.PERMISSION_DENIED,
        "Owner não identificado.",
        401,
      );
    }

    if (!input.data.byteLength) {
      throw new ConnectedCloudError(
        CloudErrors.INVALID_FILE,
        "Arquivo vazio.",
      );
    }

    const checksum =
      await calculateChecksum(input.data);

    await this.store.put(input.key, input.data, {
      contentType: input.mimeType,
      checksum,
      metadata: input.metadata,
    });

    await this.events.append({
      eventId: crypto.randomUUID(),
      type: "UPLOAD_COMPLETED",
      timestamp: new Date().toISOString(),
      actorId: input.ownerId,
      resourceId: input.key,
      requestId: crypto.randomUUID(),
      result: "success",
      metadata: { checksum },
    });

    return {
      key: input.key,
      checksum,
      size: input.data.byteLength,
    };
  }
}
