// Ferramenta: Connected Social — pesquisa real de utilizadores e publicações.
import { db } from '../../../firebase';
import { collection, query, where, orderBy, limit, getDocs, startAt, endAt } from 'firebase/firestore';

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export async function searchUsers(term: string, max = 5): Promise<{ ok: boolean; summary: string; data: any }> {
  const t = norm(term).trim();
  if (t.length < 2) return { ok: false, summary: 'Indica pelo menos 2 letras para procurar pessoas.', data: [] };
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('displayName'),
      startAt(t),
      endAt(t + ''),
      limit(max)
    );
    const snap = await getDocs(q);
    const users = snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).displayName }));
    return {
      ok: true,
      summary: users.length ? `Encontrei ${users.length} pessoa(s): ${users.map((u) => u.name).join(', ')}.` : 'Não encontrei utilizadores com esse termo.',
      data: users,
    };
  } catch (e: any) {
    return { ok: false, summary: 'Não consegui pesquisar utilizadores agora.', data: String(e?.message || e) };
  }
}

export async function searchPosts(term: string, max = 5): Promise<{ ok: boolean; summary: string; data: any }> {
  const t = norm(term).trim();
  if (t.length < 3) return { ok: false, summary: 'Indica pelo menos 3 letras para procurar publicações.', data: [] };
  try {
    const q = query(collection(db, 'posts'), where('searchTerms', 'array-contains', t), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    const posts = snap.docs.map((d) => ({ id: d.id, text: ((d.data() as any).text || '').slice(0, 80) }));
    return {
      ok: true,
      summary: posts.length ? `Encontrei ${posts.length} publicação(ões) relacionadas.` : 'Nenhuma publicação corresponde à pesquisa.',
      data: posts,
    };
  } catch {
    return { ok: false, summary: 'A pesquisa de publicações não está disponível neste momento.', data: [] };
  }
}
