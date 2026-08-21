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
    if (this.status === next) return;
    this.status = next;
    this.lastHeartbeat = Date.now();
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }
}

export const presenceEngine = new PresenceEngine();

// Publica a presença local num backend real se estiver disponível.
// Não faz nada (e não finge) se não houver backend de presença ligado.
export async function publishLocalPresence(
  _uid: string,
): Promise<void> {
  // Quando o Firestore de presença estiver ligado, escrevemos em
  // `presence/{uid}`. Por agora apenas mantém o estado local real.
  return;
}
