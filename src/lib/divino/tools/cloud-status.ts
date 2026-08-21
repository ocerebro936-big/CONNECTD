import { cloudGuardian } from "../../connected-cloud/node";
import { connectedRuntime } from "../../connected-runtime";
import { getCloudSupervision } from "../../connected-reactor/supervision";

// O DIVINO CONSULTA o estado real da Cloud (cérebro de supervisão, não
// executor). Agrega Reactor + 7 Cloud Workers num relatório humano.
export async function cloudStatus() {
  const supervision = getCloudSupervision();
  const report = cloudGuardian.report();
  const services = connectedRuntime
    .registry.list()
    .map((s) => ({ name: s.id, status: s.status }));
  return {
    ok: true,
    summary: supervision.text,
    data: { supervision, report, services },
  };
}
