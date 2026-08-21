import type { ConnectedCloudEngines } from "../core/cloud";

import {
  MemoryObjectStore,
  type ConnectedObjectStore,
} from "../storage/object-store";
import {
  MemoryDeduplication,
  type AssetDeduplication,
} from "../storage/dedup";
import {
  MemoryCloudEventLedger,
  type CloudEventLedger,
} from "../core/events";
import { MemoryUploadSessionStore } from "../storage/sessions";
import { MemoryChunkStore } from "../storage/chunks";

import {
  ConnectedUploadEngine,
  type UploadEngine,
} from "./upload";
import {
  ConnectedDownloadEngine,
  type DownloadEngine,
} from "./download";
import {
  ConnectedChunkEngine,
  type ChunkEngine,
} from "./chunk";
import {
  SessionResumeEngine,
  type ResumeEngine,
} from "./resume";
import {
  MemoryMetadataEngine,
  type MetadataEngine,
} from "./metadata";
import {
  PassThroughMediaEngine,
  type MediaProcessingEngine,
} from "./media";
import {
  MemoryCacheEngine,
  type CacheEngine,
} from "./cache";
import {
  MemoryTrafficMeter,
  type TrafficMeter,
} from "./traffic";
import {
  MemorySecurityEngine,
  type SecurityEngine,
} from "./security";
import {
  MemoryBackupEngine,
  type BackupEngine,
} from "./backup";
import {
  BackupRecoveryEngine,
  type RecoveryEngine,
} from "./recovery";
import {
  ConnectedHealthEngine,
  type HealthEngine,
} from "./health";

export interface MemoryCloudOptions {
  store?: ConnectedObjectStore;
  maxBytesPerWindow?: number;
}

// Cria todos os motores internos com implementações em memória.
// Num nó Connected real, basta trocar estas implementações por adapters
// (S3, MEGA, nó próprio) — a app continua a falar apenas com connectedCloud.
export function createMemoryEngines(
  opts: MemoryCloudOptions = {},
): ConnectedCloudEngines {
  const store: ConnectedObjectStore =
    opts.store ?? new MemoryObjectStore();

  const events: CloudEventLedger =
    new MemoryCloudEventLedger();

  const dedup: AssetDeduplication =
    new MemoryDeduplication();

  const sessions = new MemoryUploadSessionStore();
  const chunks = new MemoryChunkStore();

  const metadata: MetadataEngine =
    new MemoryMetadataEngine();

  const cache: CacheEngine =
    new MemoryCacheEngine();

  const traffic: TrafficMeter =
    new MemoryTrafficMeter();

  const security: SecurityEngine =
    new MemorySecurityEngine(opts.maxBytesPerWindow);

  const backup: BackupEngine =
    new MemoryBackupEngine();

  const recovery: RecoveryEngine =
    new BackupRecoveryEngine(backup);

  const health: HealthEngine =
    new ConnectedHealthEngine();

  const upload: UploadEngine =
    new ConnectedUploadEngine(store, events);

  const download: DownloadEngine =
    new ConnectedDownloadEngine(store);

  const chunk: ChunkEngine =
    new ConnectedChunkEngine(
      store,
      sessions,
      chunks,
      events,
    );

  const resume: ResumeEngine =
    new SessionResumeEngine(sessions);

  const media: MediaProcessingEngine =
    new PassThroughMediaEngine();

  return {
    upload,
    download,
    chunk,
    resume,
    dedup,
    metadata,
    media,
    cache,
    traffic,
    security,
    backup,
    recovery,
    events,
    health,
  };
}
