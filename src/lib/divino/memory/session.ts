// Memória de sessão — persiste a conversa no dispositivo (localStorage).
const KEY = (uid: string) => `divino_session_${uid}`;

export const session = {
  load(userId: string): { role: 'user' | 'divino'; text: string }[] {
    try {
      const raw = localStorage.getItem(KEY(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  save(userId: string, msgs: { role: 'user' | 'divino'; text: string }[]) {
    try {
      localStorage.setItem(KEY(userId), JSON.stringify(msgs.slice(-60)));
    } catch {
      /* ignora quota */
    }
  },
  clear(userId: string) {
    try {
      localStorage.removeItem(KEY(userId));
    } catch {
      /* noop */
    }
  },
};
