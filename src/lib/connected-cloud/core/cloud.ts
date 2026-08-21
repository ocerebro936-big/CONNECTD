import type {
  CloudAsset,
  CloudVisibility,
} from "./types";

import {
  ConnectedCloudError,
  CloudErrors,
} from "./errors";

import type { CloudEventLedger } from "./events";
import type { AssetDeduplication } from "../storage/dedup";
import { calculateChecksum } from "../storage/checksum";

import type { UploadEngine } from "../engines/upload";
import type { DownloadEngine } from "../engines/download";
import type { ChunkEngine } from "../engines/chunk";
import type { ResumeEngine } from "../engines/resume";
import type { MetadataEngine } from "../engines/metadata";
import type { MediaProcessingEngine } from "../engines/media";
import type { CacheEngine } from "../engines/cache";
import type { TrafficMeter } from "../engines/traffic";
import type { SecurityEngine } from "../engines/security";
import type { BackupEngine } from "../engines/backup";
import type { RecoveryEngine } from "../engines/recovery";
import type { HealthEngine } from "../engines/health";
import type { HealthReport } from "../engines/health";

// ============================================================================
// Connected Cloud Core — facade que agrega os motores internos.
// ----------------------------------------------------------------------------
// A app fala APENAS com connectedCloud (nunca com Firebase Storage direto).
// Cada motor tem interface + implementação em memória; trocar por adapters
// reais (S3/MEGA/nó próprio) não exige reescrita de Feed/Perfil/Chat/TV etc.
// ============================================================================
export interface ConnectedCloudEngines {
  upload: UploadEngine;
  download: DownloadEngine;
  chunk: ChunkEngine;
  resume: ResumeEngine;
  dedup: AssetDeduplication;
  metadata: MetadataEngine;
  media: MediaProcessingEngine;
  cache: CacheEngine;
  traffic: TrafficMeter;
  security: SecurityEngine;
  backup: BackupEngine;
  recovery: RecoveryEngine;
  events: CloudEventLedger;
  health: HealthEngine;
}

export interface CloudUploadInput {
  ownerId: string;
  key: string;
  data: Uint8Array;
  mimeType: string;
  visibility?: CloudVisibility;
  metadata?: Record<string, string>;
}

export class ConnectedCloud {
  constructor(
    public readonly engines: ConnectedCloudEngines,
  ) {}

  // ---- Upload Engine ----
  async upload(
    input: CloudUploadInput,
  ): Promise<CloudAsset> {
    const {
      ownerId,
      key,
      data,
      mimeType,
      visibility,
      metadata,
    } = input;

    if (
      !(await this.engines.security.authorize(
        ownerId,
        ownerId,
        "write",
      ))
    ) {
      throw new ConnectedCloudError(
        CloudErrors.PERMISSION_DENIED,
        "Não autorizado.",
        401,
      );
    }

    if (
      !(await this.engines.security.checkRateLimit(
        ownerId,
        data.byteLength,
      ))
    ) {
      throw new ConnectedCloudError(
        CloudErrors.QUOTA_EXCEEDED,
        "Limite de tráfego excedido.",
        429,
      );
    }

    const checksum =
      await calculateChecksum(data);

    const duplicate =
      await this.engines.dedup.find(ownerId, checksum);

    if (duplicate) {
      const head =
        await this.engines.download.head(key);

      return this.makeAsset({
        ownerId,
        key,
        size: head?.size ?? data.byteLength,
        mimeType,
        checksum,
        visibility,
        metadata,
        status: "READY",
      });
    }

    const result = await this.engines.upload.upload({
      ownerId,
      key,
      data,
      mimeType,
      visibility,
      metadata,
    });

    await this.engines.traffic.record(
      ownerId,
      data.byteLength,
    );

    await this.engines.metadata.set(
      key,
      ownerId,
      metadata ?? {},
    );

    await this.engines.media.process({
      mimeType,
      data,
      key,
    });

    await this.engines.backup.snapshot(
      key,
      ownerId,
      data,
    );

    return this.makeAsset({
      ownerId,
      key,
      size: result.size,
      mimeType,
      checksum: result.checksum,
      visibility,
      metadata,
      status: "READY",
    });
  }

  // ---- Download Engine ----
  async download(
    key: string,
    actorId: string,
    ownerId: string,
  ): Promise<Uint8Array | null> {
    if (
      !(await this.engines.security.authorize(
        actorId,
        ownerId,
        "read",
      ))
    ) {
      throw new ConnectedCloudError(
        CloudErrors.PERMISSION_DENIED,
        "Sem acesso a este objeto.",
        403,
      );
    }

    const cached =
      await this.engines.cache.get(key);

    if (cached) {
      return cached;
    }

    const data =
      await this.engines.download.get(key);

    if (data) {
      await this.engines.cache.set(key, data);
    }

    return data;
  }

  head(key: string) {
    return this.engines.download.head(key);
  }

  // ---- Chunk / Resume Engines ----
  beginChunk(opts: {
    sessionId: string;
    assetId: string;
    ownerId: string;
    key: string;
    totalSize: number;
    chunkSize: number;
  }) {
    return this.engines.chunk.begin(opts);
  }

  appendChunk(chunk: {
    sessionId: string;
    index: number;
    offset: number;
    size: number;
    data: Uint8Array;
  }) {
    return this.engines.chunk.append(chunk);
  }

  completeChunk(sessionId: string) {
    return this.engines.chunk.complete(sessionId);
  }

  resume(sessionId: string) {
    return this.engines.resume.load(sessionId);
  }

  saveResume(session: {
    sessionId: string;
    assetId: string;
    ownerId: string;
    key: string;
    totalSize: number;
    chunkSize: number;
    uploadedBytes: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  }) {
    return this.engines.resume.save(session as any);
  }

  clearResume(sessionId: string) {
    return this.engines.resume.clear(sessionId);
  }

  // ---- Metadata Engine ----
  getMetadata(key: string) {
    return this.engines.metadata.get(key);
  }

  setMetadata(
    key: string,
    ownerId: string,
    values: Record<string, string>,
  ) {
    return this.engines.metadata.set(
      key,
      ownerId,
      values,
    );
  }

  // ---- Media Processing Engine ----
  processMedia(input: {
    mimeType: string;
    data: Uint8Array;
    key: string;
  }) {
    return this.engines.media.process(input);
  }

  // ---- Cache Engine ----
  cacheGet(key: string) {
    return this.engines.cache.get(key);
  }

  cacheSet(
    key: string,
    value: Uint8Array,
    ttlMs?: number,
  ) {
    return this.engines.cache.set(key, value, ttlMs);
  }

  // ---- Traffic Meter ----
  recordTraffic(ownerId: string, bytes: number) {
    return this.engines.traffic.record(ownerId, bytes);
  }

  getTraffic(ownerId: string) {
    return this.engines.traffic.getUsage(ownerId);
  }

  // ---- Health Engine ----
  healthCheck(): Promise<HealthReport> {
    return this.engines.health.run();
  }

  // ---- Event Ledger ----
  listEvents(resourceId?: string) {
    return this.engines.events.list(resourceId);
  }

  // ---- Backup / Recovery Engines ----
  backup(assetId: string, ownerId: string, data: Uint8Array) {
    return this.engines.backup.snapshot(
      assetId,
      ownerId,
      data,
    );
  }

  recover(assetId: string, ownerId: string) {
    return this.engines.recovery.recover(
      assetId,
      ownerId,
    );
  }

  private makeAsset(input: {
    ownerId: string;
    key: string;
    size: number;
    mimeType: string;
    checksum: string;
    visibility?: CloudVisibility;
    metadata?: Record<string, string>;
    status: CloudAsset["status"];
  }): CloudAsset {
    const now = new Date().toISOString();

    return {
      assetId: crypto.randomUUID(),
      ownerId: input.ownerId,
      key: input.key,
      size: input.size,
      mimeType: input.mimeType,
      checksum: input.checksum,
      visibility: input.visibility ?? "private",
      status: input.status,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };
  }
}
