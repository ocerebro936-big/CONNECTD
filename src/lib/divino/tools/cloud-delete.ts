// ============================================================================
// DIVINO — Cloud Delete (capacidade destrutiva, EXIGE confirmação)
// ----------------------------------------------------------------------------
// "DIVINO, apaga este ficheiro" NUNCA executa cegamente. A primeira chamada
// devolve um token de confirmação; só com o token correto (do mesmo utilizador)
// é que o objeto é removido da Connected Cloud. Autorização adequada + confirmação.
// ============================================================================
import { connectedStorage } from '../../cloud-storage/provider';

const pending = new Map<string, { token: string; key: string }>();

export async function cloudDelete(ctx: { uid: string; args?: { key?: string; token?: string } }): Promise<{ ok: boolean; summary: string; data?: any }> {
  const key = ctx?.args?.key;
  const token = ctx?.args?.token;

  if (!key) {
    return { ok: false, summary: 'Indica qual ficheiro queres apagar (preciso da chave/asset).' };
  }

  const pendingForUser = pending.get(ctx.uid);
  if (!pendingForUser || pendingForUser.key !== key || pendingForUser.token !== token) {
    const t = Math.random().toString(36).slice(2, 10);
    pending.set(ctx.uid, { token: t, key });
    return {
      ok: false,
      summary: `⚠️ Eliminar "${key}" da Connected Cloud é irreversível. Confirma com "sim, apaga ${key}".`,
      data: { requiresConfirmation: true, token: t, key },
    };
  }

  pending.delete(ctx.uid);
  try {
    await connectedStorage.remove(key);
    return { ok: true, summary: `Ficheiro "${key}" apagado da Connected Cloud.`, data: { key } };
  } catch (e: any) {
    return { ok: false, summary: `Não consegui apagar: ${e?.message || e}` };
  }
}
