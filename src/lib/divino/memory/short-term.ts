// Memória de curto prazo — conversa atual (em memória, volátil).
export interface StmMessage {
  role: 'user' | 'divino';
  text: string;
  ts: number;
}

const stores = new Map<string, StmMessage[]>();

export const shortTerm = {
  push(userId: string, msg: StmMessage) {
    const arr = stores.get(userId) ?? [];
    arr.push(msg);
    if (arr.length > 40) arr.splice(0, arr.length - 40);
    stores.set(userId, arr);
  },
  all(userId: string): StmMessage[] {
    return stores.get(userId) ?? [];
  },
  last(userId: string, n = 6): StmMessage[] {
    return (stores.get(userId) ?? []).slice(-n);
  },
  clear(userId: string) {
    stores.set(userId, []);
  },
};
