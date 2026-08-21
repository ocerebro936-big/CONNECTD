// ============================================================================
// DIVINO — Cloud Trace (diagnóstico humano de falhas)
// ----------------------------------------------------------------------------
// "DIVINO, por que o vídeo não publicou?" -> o DIVINO consulta o rasto do
// Reactor (Upload -> Checksum -> Storage -> Processing) e explica ao utilizador
// onde falhou, em linguagem humana. O DIVINO nunca executa a correção sozinho.
// ============================================================================
import { digitalReactor } from "../../connected-reactor/core/reactor";

export async function cloudTrace() {
  const t = digitalReactor.trace();
  const recent = t.recent.slice(0, 12);
  const failed = recent.filter((x) => x.status === "failed");
  const lines = recent.map((x) => {
    const mark = x.status === "failed" ? "✗" : x.status === "completed" ? "✓" : "…";
    return `${mark} ${x.type} [${x.status}]${x.error ? ` — ${x.error}` : ""}`;
  });
  const diagnosis = failed.length
    ? `Última falha: ${failed[0].type} — ${failed[0].error || "sem detalhe"}. O vídeo não publicou porque o processamento falhou após o armazenamento.`
    : "Não há falhas recentes no rasto do Reactor.";
  return {
    ok: true,
    summary: `Rasto da Cloud:\n${lines.join("\n")}\n\n${diagnosis}`,
    data: { trace: t, lines },
  };
}
