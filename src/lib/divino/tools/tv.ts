// Ferramenta: Connected TV — lista canais autorizados.
import { db } from '../../../firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function listChannels(max = 8): Promise<{ ok: boolean; summary: string; data: any }> {
  try {
    const snap = await getDocs(query(collection(db, 'tvChannels'), limit(max)));
    const channels = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return {
      ok: true,
      summary: channels.length ? `Canais disponíveis: ${channels.map((c) => c.name || c.id).join(', ')}.` : 'Ainda não há canais registados.',
      data: channels,
    };
  } catch {
    return { ok: false, summary: 'Não consegui obter os canais agora.', data: [] };
  }
}
