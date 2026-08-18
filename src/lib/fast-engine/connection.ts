// ============================================================================
// Connected Fast Engine — Connection Intelligence
// Deteta a qualidade de rede (navigator.connection) para o Feed escolher o
// derivado de vídeo/imagem adequado (1080p / 720p / 480p / thumbnail).
// ============================================================================
import { useEffect, useState } from 'react';

export type ConnectionTier = 'fast' | 'medium' | 'slow' | 'offline';

export function getConnectionTier(): ConnectionTier {
  if (typeof navigator === 'undefined') return 'fast';
  const conn = (navigator as any).connection as
    | { effectiveType?: string; downlink?: number; saveData?: boolean; type?: string }
    | undefined;
  if (!conn) return 'fast';
  if (conn.saveData) return 'slow';
  const et = conn.effectiveType;
  if (et === 'slow-2g' || et === '2g') return 'slow';
  if (et === '3g') return 'medium';
  if (conn.downlink !== undefined && conn.downlink < 1.5) return 'slow';
  if (conn.downlink !== undefined && conn.downlink < 5) return 'medium';
  return 'fast';
}

/** Largura alvo de derivado com base na rede (px). */
export function targetWidthForTier(tier: ConnectionTier): number {
  switch (tier) {
    case 'slow':
      return 480;
    case 'medium':
      return 1280;
    default:
      return 1920;
  }
}

export function useConnectionTier(): ConnectionTier {
  const [tier, setTier] = useState<ConnectionTier>(getConnectionTier());
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (!conn) return;
    const update = () => setTier(getConnectionTier());
    conn.addEventListener?.('change', update);
    return () => conn.removeEventListener?.('change', update);
  }, []);
  return tier;
}
