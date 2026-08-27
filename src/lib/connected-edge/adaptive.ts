// Adaptive Media — escolhe a variante conforme a ligação do utilizador.
// Internet rápida -> large, média -> medium, lenta -> small.
import type { AdaptiveTier } from "./types";

let override: AdaptiveTier | null = null;

export function adaptiveTier(): AdaptiveTier {
  if (override) return override;
  const ec = (typeof navigator !== "undefined" && (navigator as any).connection) || null;
  const eff: string | undefined = ec?.effectiveType;
  const down: number = ec?.downlink || 0;
  if (eff === "4g" || down >= 5) return "large";
  if (eff === "3g" || down >= 1.5) return "medium";
  if (eff === "2g" || eff === "slow-2g") return "small";
  return "large";
}

export function setAdaptiveOverride(t: AdaptiveTier | null) { override = t; }

/** Constrói a chave da variante a partir do assetId + extensão. */
export function tierKey(assetId: string, ext: string, tier: AdaptiveTier): string {
  if (tier === "original") return `${assetId}.${ext}`;
  return `${assetId}_${tier}.${ext}`;
}
