// ============================================================================
// Connected Storage Infrastructure — inicialização do provider CCS
// ----------------------------------------------------------------------------
// Caminho único e oficial: Connected Cloud (Gateway de objetos real).
// Não existe Firebase Storage e não há fallback silencioso. Se o Gateway
// estiver indisponível, o erro é explícito e o upload é preservado no
// lado do cliente para retomada automática.
// ============================================================================
import { connectedStorage } from "./provider";

export function initConnectedStorage() {
  // connectedStorage já aponta para o ConnectedCloudProvider (Gateway).
  // Em produção, define VITE_CCS_GATEWAY_URL para o teu node/controller.
  // eslint-disable-next-line no-console
  console.info("[Connected Cloud] Storage provider ativo: Connected Cloud Gateway");
  return connectedStorage.provider;
}
