import { memoryManager } from "../../memory/memory-manager";
import type { ToolContext } from "../registry";

// Devolve o contexto imediato (curto prazo + sessão) para o cérebro raciocinar.
export async function contextPlugin(ctx: ToolContext) {
  const recent = memoryManager.recentContext(ctx.uid, 8);
  const summary = recent.length
    ? "Contexto actual:\n" + recent.map((t) => `- ${t}`).join("\n")
    : "Sem contexto activo.";
  return { ok: true, summary, data: recent };
}
