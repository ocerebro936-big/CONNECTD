// ============================================================================
// Connected King — Presence Engine (local, sinais reais)
// ----------------------------------------------------------------------------
// Presença NÃO assume "internet ligada = online". O estado reflete sinais
// reais do browser: visibilidade da aba, foco da janela e atividade do
// utilizador (mouse/teclado). Heartbeat real baseado nesses sinais.
//
// Nota honesta: a presença de OUTROS utilizadores exige um backend
// (Firestore/Realtime DB) que ainda não está ligado. Quando ligado, este
// motor publica/subscreve `presence/{uid}`; entretanto suporta só local.
// ============================================================================
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

export type PresenceStatus = "online" | "active" | "offline";

export interface PresenceState {
  status: PresenceStatus;
  lastHeartbeat: number;
}

type Listener = (state: PresenceState) => void;

const ACTIVE_TIMEOUT_MS = 60_000; // sem atividade -> "online" (não "active")

class PresenceEngine {
  private status: PresenceStatus = "offline";
  private lastActivity = Date.now();
  private lastHeartbeat = Date.now();
  private listeners = new Set<Listener>();
  private started = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private uid: string | null = null;

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.lastActivity = Date.now();
    this.setStatus(document.visibilityState === "visible" ? "active" : "offline");

    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("focus", this.onFocus);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("mousemove", this.onActivity, { passive: true });
    window.addEventListener("keydown", this.onActivity, { passive: true });
    window.addEventListener("beforeunload", this.onUnload);

    this.timer = setInterval(() => this.tick(), 5_000);
    this.tick();
  }

  stop(): void {
    if (!this.started) return;
    this.publish("offline");
    this.started = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("mousemove", this.onActivity);
    window.removeEventListener("keydown", this.onActivity);
    window.removeEventListener("beforeunload", this.onUnload);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): PresenceState {
    return {
      status: this.status,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  private onVisibility = () => {
    if (document.visibilityState === "visible") {
      this.lastActivity = Date.now();
      this.setStatus("active");
    } else {
      this.setStatus("offline");
    }
  };

  private onFocus = () => {
    this.lastActivity = Date.now();
    this.setStatus("active");
  };

  private onBlur = () => {
    this.setStatus("online");
  };

  private onActivity = () => {
    this.lastActivity = Date.now();
    if (this.status !== "offline") this.setStatus("active");
  };

  private onUnload = () => {
    this.setStatus("offline");
  };

  private tick(): void {
    this.lastHeartbeat = Date.now();
    if (this.status !== "offline") {
      const idle = Date.now() - this.lastActivity > ACTIVE_TIMEOUT_MS;
      this.setStatus(idle ? "online" : "active");
    }
  }

  private setStatus(next: PresenceStatus): void {
    if (this.status === next) { this.publish(next); return; }
    this.status = next;
    this.lastHeartbeat = Date.now();
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
    this.publish(next);
  }

  // Liga o uid e publica a presença real em `presence/{uid}` (backend).
  bindUser(uid: string): void {
    this.uid = uid;
    this.publish(this.status);
  }

  // Publica no backend. NUNCA finge: só escreve se houver uid e Firestore.
  private async publish(status: PresenceStatus): Promise<void> {
    if (!this.uid) return;
    const now = Date.now();
    setDoc(doc(db, "presence", this.uid), {
      uid: this.uid,
      status,
      lastSeen: now,
      lastActivity: this.lastActivity,
      device: typeof navigator !== "undefined" ? navigator.userAgent || "web" : "web",
    }, { merge: true }).catch(() => {});
  }
}

export const presenceEngine = new PresenceEngine();

// ----------------------------------------------------------------------------
// Presença REMOTA (outros utilizadores) — lê `presence/{uid}` do backend.
// O estado é DERIVADO dos timestamps reais; nunca assumimos "online" só
// porque existe um documento antigo.
// ----------------------------------------------------------------------------
const REMOTE_TIMEOUTS = {
  connectionAliveMs: 30_000,
  onlineActivityMs: 60_000,
  activeConnectionMs: 10 * 60_000,
};

function deriveRemote(d: any): PresenceStatus {
  const now = Date.now();
  const seen = d?.lastSeen || 0;
  const act = d?.lastActivity || seen;
  if (!seen) return "offline";
  if (now - seen > REMOTE_TIMEOUTS.activeConnectionMs) return "offline";
  if (now - seen > REMOTE_TIMEOUTS.connectionAliveMs) return "active";
  if (now - act > REMOTE_TIMEOUTS.onlineActivityMs) return "active";
  return "online";
}

export interface RemotePresence {
  uid: string;
  status: PresenceStatus;
  lastSeen: number;
  lastActivity: number;
}

export function subscribeRemotePresence(
  uid: string,
  cb: (p: RemotePresence | null) => void
): () => void {
  const ref = doc(db, "presence", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return cb(null);
      const d = snap.data() as any;
      cb({ uid, status: deriveRemote(d), lastSeen: d.lastSeen || 0, lastActivity: d.lastActivity || 0 });
    },
    () => cb(null)
  );
}

export async function getRemotePresence(uid: string): Promise<RemotePresence | null> {
  const snap = await getDoc(doc(db, "presence", uid)).catch(() => null);
  if (!snap || !snap.exists()) return null;
  const d = snap.data() as any;
  return { uid, status: deriveRemote(d), lastSeen: d.lastSeen || 0, lastActivity: d.lastActivity || 0 };
}

