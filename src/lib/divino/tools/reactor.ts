import { getReactorStatus } from "../../connected-reactor";

// O DIVINO CONSULTA o Reactor, mas NUNCA pode desligar infraestrutura crítica.
export async function reactorStatus() {
  return getReactorStatus();
}
