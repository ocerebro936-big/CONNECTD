import type { UploadSessionStore } from "../storage/sessions";
import type { UploadSession } from "../core/types";

export interface ResumeEngine {
  save(session: UploadSession): Promise<void>;
  load(sessionId: string): Promise<UploadSession | null>;
  clear(sessionId: string): Promise<void>;
}

export class SessionResumeEngine
  implements ResumeEngine {

  constructor(
    private readonly store: UploadSessionStore,
  ) {}

  async save(session: UploadSession) {
    await this.store.create(session);
  }

  async load(sessionId: string) {
    return this.store.get(sessionId);
  }

  async clear(sessionId: string) {
    await this.store.delete(sessionId);
  }
}
