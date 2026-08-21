// Tipos partilhados da memória modular do DIVINO.
export type MemoryTier =
  | "short-term"
  | "session"
  | "working"
  | "semantic"
  | "episodic"
  | "user";

export type MemoryConsent =
  | "granted"
  | "revoked"
  | "pending";

export interface RetentionPolicy {
  // dias até eliminação automática (0 = apenas sessão)
  maxAgeDays: number;
  // requer consentimento explícito para reter
  requiresConsent: boolean;
}

export interface MemoryEntry {
  id: string;
  tier: MemoryTier;
  uid?: string;
  content: string;
  tokens: string[];
  createdAt: string;
  expiresAt: string;
  consent: MemoryConsent;
  importance: number; // 0..1
}

export interface RecallResult {
  entry: MemoryEntry;
  score: number;
}
