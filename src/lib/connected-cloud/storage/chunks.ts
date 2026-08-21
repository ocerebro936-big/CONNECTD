import {
  ConnectedCloudError,
  CloudErrors,
} from "../core/errors";

export interface UploadChunk {
  sessionId: string;

  index: number;

  offset: number;

  size: number;

  data: Uint8Array;
}

export interface ChunkStore {
  save(
    chunk: UploadChunk,
  ): Promise<void>;

  get(
    sessionId: string,
    index: number,
  ): Promise<UploadChunk | null>;

  list(
    sessionId: string,
  ): Promise<UploadChunk[]>;

  delete(
    sessionId: string,
  ): Promise<void>;
}

export class MemoryChunkStore
  implements ChunkStore {

  private chunks =
    new Map<string, UploadChunk>();

  private key(
    sessionId: string,
    index: number,
  ) {
    return `${sessionId}:${index}`;
  }

  async save(chunk: UploadChunk) {
    if (
      chunk.size !== chunk.data.byteLength
    ) {
      throw new ConnectedCloudError(
        CloudErrors.CHUNK_INVALID,
        "Chunk size inválido.",
      );
    }

    this.chunks.set(
      this.key(
        chunk.sessionId,
        chunk.index,
      ),
      chunk,
    );
  }

  async get(
    sessionId: string,
    index: number,
  ) {
    return (
      this.chunks.get(
        this.key(sessionId, index),
      ) ?? null
    );
  }

  async list(sessionId: string) {
    return Array.from(
      this.chunks.values(),
    )
      .filter(
        (chunk) =>
          chunk.sessionId === sessionId,
      )
      .sort(
        (a, b) => a.index - b.index,
      );
  }

  async delete(sessionId: string) {
    for (const key of this.chunks.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.chunks.delete(key);
      }
    }
  }
}
