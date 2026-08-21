import { memoryManager } from "../../memory/memory-manager";
import type { ToolContext } from "../registry";

// Recupera memórias relevantes para o contexto actual (semântica + episódica).
export async function recallPlugin(ctx: ToolContext) {
  const items = await memoryManager.recall(
    ctx.uid,
    ctx.term || "",
    6,
  );
  const summary = items.length
    ? "Memórias relevantes:\n" +
      items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
    : "Sem memórias relevantes para este contexto.";
  return { ok: true, summary, data: items };
}
