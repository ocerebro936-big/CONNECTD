import { cloudGuardian } from "../../connected-cloud/node";
import { connectedRuntime } from "../../connected-runtime";

// O DIVINO CONSULTA o estado real da Cloud. Só leitura — sem autoridade para
// apagar, mover ou modificar objetos críticos.
export async function cloudStatus() {
  const report = cloudGuardian.report();
  const services = connectedRuntime
    .registry.list()
    .map((s) => ({ name: s.id, status: s.status }));
  const operational = report.fleet.offline === 0;
  const summary = operational
    ? `A Connected Cloud está operacional. ${report.fleet.online} node(s) online, ${report.runtime.ready} serviço(s) pronto(s) e ${report.fleet.errors} erro(s) acumulado(s).`
    : `A Connected Cloud tem falhas: ${report.fleet.offline} node(s) offline e ${report.runtime.offline} serviço(s) offline.`;
  return {
    ok: true,
    summary,
    data: { report, services },
  };
}
