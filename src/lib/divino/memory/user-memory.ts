// ============================================================================
// Memória de utilizador (long-term) — autorizada, com retenção e eliminação.
// Vive no Firestore (collection divinoUserMemory) para sobreviver a dispositivos.
// O utilizador pode apagar a qualquer momento (direito ao esquecimento).
// ============================================================================
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const refOf = (uid: string) => doc(db, 'divinoUserMemory', uid);

export const userMemory = {
  async get(uid: string, key: string): Promise<string | null> {
    try {
      const snap = await getDoc(refOf(uid));
      const data = snap.data() as any;
      return data?.facts?.[key] ?? null;
    } catch {
      return null;
    }
  },

  async set(uid: string, key: string, value: string): Promise<void> {
    try {
      const snap = await getDoc(refOf(uid));
      const facts = (snap.data() as any)?.facts ?? {};
      facts[key] = value;
      await setDoc(refOf(uid), { facts, updatedAt: serverTimestamp(), consent: true }, { merge: true });
    } catch {
      /* noop */
    }
  },

  async erase(uid: string): Promise<void> {
    try {
      await deleteDoc(refOf(uid));
    } catch {
      /* noop */
    }
  },
};
