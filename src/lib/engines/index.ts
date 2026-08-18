// ============================================================================
// Connected Cloud Core — arranque dos motores
// ----------------------------------------------------------------------------
import { engineRegistry } from '../connected-engine';
import {
  StorageEngine,
  HealthEngine,
  MediaEngine,
  SeoEngine,
  DiscoveryEngine,
  CleanupEngine,
  BackupEngine,
  SecurityEngine,
  NotificationEngine,
  BillingEngine,
} from './engines';

let timer: ReturnType<typeof setInterval> | null = null;

export function startCloudCore(intervalMs = 1000 * 60 * 2): () => void {
  engineRegistry.register(new StorageEngine());
  engineRegistry.register(new HealthEngine());
  engineRegistry.register(new MediaEngine());
  engineRegistry.register(new SeoEngine());
  engineRegistry.register(new DiscoveryEngine());
  engineRegistry.register(new CleanupEngine());
  engineRegistry.register(new BackupEngine());
  engineRegistry.register(new SecurityEngine());
  engineRegistry.register(new NotificationEngine());
  engineRegistry.register(new BillingEngine());

  // primeira corrida imediata
  engineRegistry.tick();

  if (timer) clearInterval(timer);
  timer = setInterval(() => engineRegistry.tick(), intervalMs);

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
