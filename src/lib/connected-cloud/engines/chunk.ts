import type { ChunkStore, UploadChunk } from "../storage/chunks";
import type { UploadSessionStore } from "../storage/sessions";
import type { ConnectedObjectStore } from "../storage/object-store";
import type { CloudEventLedger } from "../core/events";
import { calculateChecksum } from "../storage/checksum";
import type { UploadSession } from "../core/types";
import { ConnectedCloudError, CloudErrors } from "../core/errors";

export interface BeginChunkInput {
  sessionId: string;
  assetId: string;
  ownerId: string;
  key: string;
  totalSize: number;
  chunkSize: number;
}

export interface ChunkEngine {
  begin(input: BeginChunkInput): Promise<UploadSession>;
  append(chunk: UploadChunk): Promise<void>;
  complete(
    sessionId: string,
  ): Promise<{ key: string; size: number; checksum: string }>;
  status(
    sessionId: string,
  ): Promise<UploadSession | null>;
}

export class ConnectedChunkEngine
  implements ChunkEngine {

  constructor(
    private readonly store: ConnectedObjectStore,
    private readonly sessions: UploadSessionStore,
    private readonly chunks: ChunkStore,
    private readonly events: CloudEventLedger,
  ) {}

  async begin(
    input: BeginChunkInput,
  ): Promise<UploadSession> {
    const now = new Date().toISOString();

    const session: UploadSession = {
      sessionId: input.sessionId,
      assetId: input.assetId,
      ownerId: input.ownerId,
      key: input.key,
      totalSize: input.totalSize,
      chunkSize: input.chunkSize,
      uploadedBytes: 0,
      status: "created",
      createdAt: now,
      updatedAt: now,
    };

    await this.sessions.create(session);

    return session;
  }

  async append(chunk: UploadChunk) {
    await this.chunks.save(chunk);

    const session =
      await this.sessions.get(chunk.sessionId);

    if (session) {
      await this.sessions.update(chunk.sessionId, {
        uploadedBytes:
          session.uploadedBytes + chunk.size,
        status: "uploading",
      });
    }
  }

  async complete(
    sessionId: string,
  ): Promise<{ key: string; size: number; checksum: string }> {
    const session =
      await this.sessions.get(sessionId);

    if (!session) {
      throw new ConnectedCloudError(
        CloudErrors.SESSION_NOT_FOUND,
        "Sessão de chunk não encontrada.",
        404,
      );
    }

    const parts = await this.chunks.list(sessionId);

    const total = parts.reduce(
      (sum, c) => sum + c.size,
      0,
    );

    if (total !== session.totalSize) {
      throw new ConnectedCloudError(
        CloudErrors.CHUNK_INVALID,
        `Tamanho incompatível: esperado ${session.totalSize}, recebido ${total}.`,
      );
    }

    const buffer = new Uint8Array(total);
    let offset = 0;

    for (const part of parts) {
      buffer.set(part.data, offset);
      offset += part.size;
    }

    const checksum =
      await calculateChecksum(buffer);

    await this.store.put(session.key, buffer, {
      contentType: "application/octet-stream",
      checksum,
    });

    await this.chunks.delete(sessionId);
    await this.sessions.delete(sessionId);

    await this.events.append({
      eventId: crypto.randomUUID(),
      type: "CHUNK_COMPLETED",
      timestamp: new Date().toISOString(),
      actorId: session.ownerId,
      resourceId: session.assetId,
      requestId: sessionId,
      result: "success",
      metadata: { key: session.key, checksum },
    });

    return {
      key: session.key,
      size: total,
      checksum,
    };
  }

  async status(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}
