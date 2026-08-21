import { memoryManager } from "../../memory/memory-manager";
import type { ToolContext } from "../registry";

// Plugin principal de memória: estado agregado dos sub-sistemas.
export async function memoryPlugin(ctx: ToolContext) {
  const stores = memoryManager.index.list();
  const summary =
    "Estado da memória DIVINO:\n" +
    stores
      .map(
        (s) =>
          `  • ${s.tier} (${s.id}): ${s.enabled ? "ativo" : "inativo"}`,
      )
      .join("\n");
  return { ok: true, summary, data: stores };
}
