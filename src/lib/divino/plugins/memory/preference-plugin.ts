import { memoryManager } from "../../memory/memory-manager";
import { userMemory } from "../../memory/user-memory";
import type { ToolContext } from "../registry";

// Lê/gera preferências e gere consentimento de memória do utilizador.
export async function preferencePlugin(ctx: ToolContext) {
  if (!ctx.uid) {
    return {
      ok: false,
      summary: "Sem utilizador para gerir preferências.",
      data: null,
    };
  }

  if (/elimin|apagar|esquecer|forget/i.test(ctx.term || "")) {
    await memoryManager.forget(ctx.uid);
    return {
      ok: true,
      summary: "Memória do utilizador eliminada conforme pedido.",
      data: null,
    };
  }

  if (/consent|autoriz/i.test(ctx.term || "")) {
    await memoryManager.setConsent(ctx.uid, true);
    return {
      ok: true,
      summary: "Consentimento de memória registado.",
      data: { consent: "granted" },
    };
  }

  const consent = await userMemory.get(ctx.uid, "consent");
  const summary = `Consentimento de memória: ${consent ?? "por definir"}`;
  return { ok: true, summary, data: { consent } };
}
