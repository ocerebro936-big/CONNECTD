// Connected King Global Cloud — barrel + instância global.
import './services/cloud';
import './services/social';
import './services/tv';
import './services/games';
import './services/marketplace';
import './services/wallet';
import './services/jobs';
import './services/analytics';

export * from './service-bus/registry';
export * from './service-bus/router';
export * from './service-bus/events';
export * from './service-bus/health';
export * from './gateway/gateway';
export * from './audit';
export * from './usage';

// Singleton de orquestração global. Importar em qualquer parte da app:
//   import { globalCloud } from '@/lib/connected';
export const globalCloud = {
  invoke,
  diagnoseAll,
  runOrchestration,
  listServices,
} as const;

import { invoke, diagnoseAll, runOrchestration } from './gateway/gateway';
import { listServices } from './service-bus/registry';

// Garante que os serviços fiquem registados mal este módulo é importado.
listServices();
