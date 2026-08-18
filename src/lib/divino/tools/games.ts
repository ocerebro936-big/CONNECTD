// Ferramenta: Connected Games — ranking e pontuação real.
import { getRankings } from '../../game-save';

export async function retrieveRanking(max = 10): Promise<{ ok: boolean; summary: string; data: any }> {
  try {
    const r = await getRankings(max);
    return {
      ok: true,
      summary: r.length ? `Top ${r.length}: ${r.map((x, i) => `${i + 1}. ${x.name} (${x.coins} 🪙)`).join(' · ')}.` : 'Sem dados de ranking ainda.',
      data: r,
    };
  } catch (e: any) {
    return { ok: false, summary: 'Não consegui obter o ranking.', data: String(e?.message || e) };
  }
}

export async function inspectScore(uid: string): Promise<{ ok: boolean; summary: string; data: any }> {
  try {
    const r = await getRankings(50);
    const me = r.find((x) => x.uid === uid);
    return {
      ok: true,
      summary: me ? `Tens ${me.coins} Game Coins e estás no nível ${me.level}.` : 'Ainda não tens pontuação no Connected RUN.',
      data: me ?? null,
    };
  } catch {
    return { ok: false, summary: 'Não consegui obter a tua pontuação.', data: null };
  }
}
