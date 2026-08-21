// DIVINO IA — ferramenta de consulta da economia (SÓ-LEITURA).
// O Divino NUNCA movimenta dinheiro: apenas relata o saldo/estado do utilizador.
import { connectedEconomy } from '../../economy';

export async function economyStatus(uid: string) {
  if (!uid) return { ok: false, summary: 'Sem utilizador para consultar.', data: null };
  const s = await connectedEconomy.getEconomySummary(uid);
  const b = s.balance;
  const summary =
    `Economia Connected 👑\n` +
    `⭐ Pontos: ${b.points} · XP: ${b.xp}\n` +
    `💎 Gems: ${b.gems} · 🎟️ Tickets: ${b.tickets}\n` +
    `💵 Disponível: ${b.availableCash} MZN · Pendente: ${b.pendingCash} MZN · Sacado: ${b.withdrawnCash} MZN\n` +
    `Saques em aberto: ${s.withdrawalsOpen}. O DIVINO apenas consulta — não move dinheiro.`;
  return { ok: true, summary, data: s };
}
