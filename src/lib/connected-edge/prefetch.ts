// Prefetch — aquece o Edge Cache para os próximos assets (Feed mais rápido).
// O Fast Engine (#arquitetura) pode chamar isto para antecipar o conteúdo.
import { deliverAsset, type DeliverOptions } from "./delivery";

export function prefetchAssets(keys: string[], opts: Partial<DeliverOptions> = {}): void {
  for (const key of keys) {
    deliverAsset({ key, visibility: opts.visibility || "public", tier: opts.tier, ownerId: opts.ownerId })
      .catch(() => { /* prefetch silencioso */ });
  }
}
