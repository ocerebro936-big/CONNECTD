import { db } from "../../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import type { MemoryEntry } from "./types";

// Memória episódica: guarda episódios importantes (factos, decisões, eventos)
// por utilizador. Retenção com regra de idade máxima.
export class EpisodicMemory {
  async remember(entry: MemoryEntry): Promise<void> {
    if (!entry.uid) return;
    await addDoc(
      collection(db, "divinoEpisodic", entry.uid, "facts"),
      entry,
    );
  }

  async recall(
    uid: string,
    sinceDays = 30,
  ): Promise<MemoryEntry[]> {
    if (!uid) return [];
    const since = new Date(
      Date.now() - sinceDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const snap = await getDocs(
      query(
        collection(db, "divinoEpisodic", uid, "facts"),
        where("createdAt", ">=", since),
      ),
    );
    return snap.docs.map((d) => d.data() as MemoryEntry);
  }

  async forget(uid: string): Promise<void> {
    if (!uid) return;
    const snap = await getDocs(
      query(collection(db, "divinoEpisodic", uid, "facts"), limit(200)),
    );
    await Promise.all(
      snap.docs.map((d) =>
        deleteDoc(doc(db, "divinoEpisodic", uid, "facts", d.id)),
      ),
    );
  }
}
