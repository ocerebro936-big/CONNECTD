import type {
  CloudAsset,
  CloudVisibility,
} from "./types";

import {
  ConnectedCloudError,
  CloudErrors,
} from "./errors";

import type {
  ConnectedObjectStore,
} from "../storage/object-store";

import type {
  AssetDeduplication,
} from "../storage/dedup";

import {
  calculateChecksum,
} from "../storage/checksum";

import type {
  CloudEventLedger,
} from "./events";

export class ConnectedCloud {

  constructor(
    private readonly storage:
      ConnectedObjectStore,

    private readonly dedup:
      AssetDeduplication,

    private readonly events:
      CloudEventLedger,
  ) {}

  async upload(input: {
    ownerId: string;

    key: string;

    data: Uint8Array;

    mimeType: string;

    visibility?: CloudVisibility;

    metadata?: Record<string, string>;
  }): Promise<CloudAsset> {

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
      await calculateChecksum(
        input.data,
      );

    const duplicate =
      await this.dedup.find(
        input.ownerId,
        checksum,
      );

    if (duplicate) {
      const existing =
        await this.storage.head(
          input.key,
        );

      if (!existing) {
        throw new ConnectedCloudError(
          CloudErrors.ASSET_NOT_FOUND,
          "Asset duplicado não encontrado.",
          404,
        );
      }

      return {
        assetId: duplicate,

        ownerId: input.ownerId,

        key: input.key,

        size: existing.size,

        mimeType:
          existing.contentType,

        checksum,

        visibility:
          input.visibility ??
          "private",

        status: "READY",

        version: 1,

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),

        metadata:
          input.metadata ?? {},
      };
    }

    const assetId =
      crypto.randomUUID();

    const requestId =
      crypto.randomUUID();

    await this.events.append({
      eventId:
        crypto.randomUUID(),

      type:
        "UPLOAD_STARTED",

      timestamp:
        new Date().toISOString(),

      actorId:
        input.ownerId,

      resourceId:
        assetId,

      requestId,

      result:
        "success",
    });

    await this.storage.put(
      input.key,
      input.data,
      {
        contentType:
          input.mimeType,

        checksum,

        metadata:
          input.metadata,
      },
    );

    await this.dedup.remember(
      input.ownerId,
      checksum,
      assetId,
    );

    const now =
      new Date().toISOString();

    const asset: CloudAsset = {
      assetId,

      ownerId:
        input.ownerId,

      key:
        input.key,

      size:
        input.data.byteLength,

      mimeType:
        input.mimeType,

      checksum,

      visibility:
        input.visibility ??
        "private",

      status:
        "READY",

      version:
        1,

      createdAt:
        now,

      updatedAt:
        now,

      metadata:
        input.metadata ?? {},
    };

    await this.events.append({
      eventId:
        crypto.randomUUID(),

      type:
        "ASSET_READY",

      timestamp:
        now,

      actorId:
        input.ownerId,

      resourceId:
        assetId,

      requestId,

      result:
        "success",

      metadata: {
        key:
          input.key,

        checksum,
      },
    });

    return asset;
  }
}
