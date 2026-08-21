import type {
  UploadSession,
} from "../core/types";

export interface UploadSessionStore {
  create(
    session: UploadSession,
  ): Promise<void>;

  get(
    sessionId: string,
  ): Promise<UploadSession | null>;

  update(
    sessionId: string,
    patch: Partial<UploadSession>,
  ): Promise<void>;

  delete(
    sessionId: string,
  ): Promise<void>;
}

export class MemoryUploadSessionStore
  implements UploadSessionStore {

  private sessions =
    new Map<string, UploadSession>();

  async create(session: UploadSession) {
    this.sessions.set(
      session.sessionId,
      session,
    );
  }

  async get(sessionId: string) {
    return (
      this.sessions.get(sessionId) ?? null
    );
  }

  async update(
    sessionId: string,
    patch: Partial<UploadSession>,
  ) {
    const current =
      this.sessions.get(sessionId);

    if (!current) {
      return;
    }

    this.sessions.set(
      sessionId,
      {
        ...current,
        ...patch,
        updatedAt:
          new Date().toISOString(),
      },
    );
  }

  async delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}
