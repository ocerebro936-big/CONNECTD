import { shortTerm } from "./short-term";
import { session } from "./session";
import { userMemory } from "./user-memory";
import {
  tokenize,
  relevanceScore,
} from "./semantic-memory";
import { EpisodicMemory } from "./episodic-memory";
import { WorkingMemory } from "./working-memory";
import { MemoryIndex } from "./memory-index";
import { MemoryCache } from "./memory-cache";
import type { MemoryEntry } from "./types";

// ============================================================================
// Memory Manager — orquestra as camadas de memória do DIVINO.
// ----------------------------------------------------------------------------
// Reutiliza os stores já existentes (short-term, session, user-memory) e junta
// camadas novas (semântica, episódica, working, índice, cache). Regras de
// retenção: não decoramos tudo; só persiste para além da sessão com
// consentimento; o utilizador pode eliminar tudo (direito ao esquecimento).
// ============================================================================
export class MemoryManager {
  readonly episodic = new EpisodicMemory();
  readonly working = new WorkingMemory();
  readonly index = new MemoryIndex();
  readonly cache = new MemoryCache();

  constructor() {
    this.index.register({
      id: "short-term",
      tier: "short-term",
      enabled: true,
    });
    this.index.register({
      id: "session",
      tier: "session",
      enabled: true,
    });
    this.index.register({
      id: "episodic",
      tier: "episodic",
      enabled: true,
    });
    this.index.register({
      id: "user",
      tier: "user",
      enabled: true,
    });
  }

  private stmRole(
    role: "user" | "assistant",
  ): "user" | "divino" {
    return role === "user" ? "user" : "divino";
  }

  private important(content: string): boolean {
    return /(quero|preciso|decidi|lembra|importante|problema|ajuda|configur|pagamento|saque|saldo|conta|ordem)/i.test(
      content,
    );
  }

  async storeInteraction(
    uid: string | undefined,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    if (!uid) {
      return;
    }

    shortTerm.push(uid, {
      role: this.stmRole(role),
      text: content,
      ts: Date.now(),
    });

    const history = session.load(uid);
    history.push({ role: this.stmRole(role), text: content });
    session.save(uid, history);

    const consent =
      (await userMemory.get(uid, "consent")) === "granted";

    if (this.important(content) && consent) {
      const entry: MemoryEntry = {
        id: crypto.randomUUID(),
        tier: "episodic",
        uid,
        content,
        tokens: tokenize(content),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        consent: "granted",
        importance: 0.8,
      };
      try {
        await this.episodic.remember(entry);
      } catch {
        /* offline */
      }
    }
  }

  recentContext(uid: string, max = 8): string[] {
    if (!uid) return [];
    return [
      ...shortTerm.last(uid, max).map((m) => m.text),
      ...session.load(uid).slice(-max).map((m) => m.text),
    ];
  }

  async recall(
    uid: string | undefined,
    query: string,
    max = 6,
  ): Promise<string[]> {
    if (!uid) {
      return [];
    }

    const key = `recall:${uid}:${query}`;
    const cached = this.cache.get<string[]>(key);
    if (cached) {
      return cached;
    }

    const qTokens = tokenize(query);
    const candidates: string[] = [
      ...shortTerm.last(uid, 20).map((m) => m.text),
      ...session.load(uid).map((m) => m.text),
    ];

    let episodic: MemoryEntry[] = [];
    try {
      episodic = await this.episodic.recall(uid);
    } catch {
      /* offline */
    }

    const all = [
      ...candidates.map((text) => ({
        text,
        tokens: tokenize(text),
      })),
      ...episodic.map((e) => ({
        text: e.content,
        tokens: e.tokens,
      })),
    ];

    const scored = all
      .map((c) => ({
        text: c.text,
        score: relevanceScore(qTokens, c.tokens),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((s) => s.text);

    this.cache.set(key, scored);
    return scored;
  }

  async setConsent(uid: string, granted: boolean): Promise<void> {
    try {
      await userMemory.set(
        uid,
        "consent",
        granted ? "granted" : "revoked",
      );
    } catch {
      /* offline */
    }
  }

  async forget(uid: string): Promise<void> {
    shortTerm.clear(uid);
    this.working.clear();
    this.cache.clear();
    session.clear(uid);
    try {
      await this.episodic.forget(uid);
      await userMemory.erase(uid);
    } catch {
      /* offline */
    }
  }
}

export const memoryManager = new MemoryManager();
