// ============================================================================
// Background Engine — fundos dinâmicos da Connected King.
// ----------------------------------------------------------------------------
// Fontes REAIS: collection `backgrounds` no Firestore (CCS / ativos oficiais
// Connected). Não usamos URLs aleatórias da Internet. Se não houver fundos
// configurados, o componente aplica o gradiente de marca (honesto: "sem
// conteúdo disponível" em vez de inventar).
// ============================================================================
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

export interface BackgroundAsset {
  id: string;
  url: string;
  label?: string;
  weight?: number;
  active?: boolean;
}

type Listener = (url: string | null) => void;

export class BackgroundEngine {
  private assets: BackgroundAsset[] = [];
  private index = 0;
  private listeners = new Set<Listener>();

  async load(): Promise<void> {
    try {
      const snap = await getDocs(
        query(
          collection(db, "backgrounds"),
          where("active", "==", true),
          orderBy("weight", "desc"),
        ),
      );
      this.assets = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<BackgroundAsset, "id">) }),
      );
      this.index = 0;
      this.emit();
    } catch {
      // Firestore offline: mantém vazio (fundo de marca como fallback)
      this.assets = [];
      this.emit();
    }
  }

  current(): string | null {
    return this.assets.length
      ? this.assets[this.index]?.url ?? null
      : null;
  }

  next(): string | null {
    if (!this.assets.length) return null;
    this.index = (this.index + 1) % this.assets.length;
    this.emit();
    return this.current();
  }

  list(): BackgroundAsset[] {
    return this.assets;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb(this.current());
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    const url = this.current();
    for (const l of this.listeners) l(url);
  }
}
