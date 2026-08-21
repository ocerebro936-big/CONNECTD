import { memoryManager } from "../../memory/memory-manager";
import type { ToolContext } from "../registry";

// Resume a conversa recente numa síntese curta (para o cérebro não repetir).
export async function summarizePlugin(ctx: ToolContext) {
  const recent = memoryManager.recentContext(ctx.uid, 8);
  if (!recent.length) {
    return { ok: true, summary: "Nada para resumir ainda.", data: [] };
  }
  const summary =
    "Resumo da conversa:\n" + recent.map((t) => `- ${t}`).join("\n");
  return { ok: true, summary, data: recent };
}
