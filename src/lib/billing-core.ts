// ============================================================================
// Connected Cloud Core — Connected Billing Core
// ----------------------------------------------------------------------------
// Controla os serviços externos usados pela plataforma: registo de fornecedores,
// planos, consumo, limites de gasto e alertas. Não garante que um fornecedor
// nunca falha — por isso há monitorização + fallback (Health Engine).
// ============================================================================
import { QUOTA_BYTES, computeUsedBytes, formatBytes, getTier } from './cloud-storage/quota-engine';

export interface ProviderRegistryEntry {
  id: string;
  label: string;
  plan: string;
  monthlyCostUsd: number;
  usedPct: number; // 0..100
  status: 'ok' | 'warning' | 'down';
  renewal?: string;
  notes?: string;
}

/** Fornecedores externos da Connected (infraestrutura Cloud). */
export const PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
  { id: 'firebase-storage', label: 'Cloud Storage', plan: 'Pay-as-you-go', monthlyCostUsd: 0, usedPct: 0, status: 'ok', notes: 'Objetos em GCS via Firebase' },
  { id: 'mega-storage', label: 'MEGA Storage', plan: 'Pro / Business', monthlyCostUsd: 0, usedPct: 0, status: 'ok', notes: 'Backup/arquivo via megaBridge (CON-WORKER). Credenciais no servidor.' },
  { id: 'firebase-auth', label: 'Authentication', plan: 'Free tier', monthlyCostUsd: 0, usedPct: 0, status: 'ok' },
  { id: 'firestore', label: 'Database', plan: 'Pay-as-you-go', monthlyCostUsd: 0, usedPct: 0, status: 'ok' },
  { id: 'cdn', label: 'CDN / Hosting', plan: 'Firebase Hosting', monthlyCostUsd: 0, usedPct: 0, status: 'ok' },
];

/** Custo estimado de armazenamento (referência grosseira: $0.02 / GB-mês). */
export function estimateStorageCostUsd(bytes: number): number {
  return (bytes / (1024 * 1024 * 1024)) * 0.02;
}

export function evaluateProviderHealth(providers: ProviderRegistryEntry[]): string[] {
  const alerts: string[] = [];
  for (const p of providers) {
    if (p.status === 'down') alerts.push(`⚠️ ${p.label} indisponível — a usar fallback.`);
    else if (p.usedPct >= 80) alerts.push(`⚠️ ${p.label}: consumo em ${p.usedPct}% do limite contratado.`);
  }
  return alerts;
}

/** Alerta de quota de storage do utilizador (escalão atual). */
export async function storageQuotaAlert(ownerId: string, user: any, profileData?: any): Promise<string | null> {
  const tier = getTier(user, profileData);
  const used = await computeUsedBytes(ownerId);
  const pct = (used / QUOTA_BYTES[tier]) * 100;
  if (pct >= 80) {
    const msg = 'Connected Billing: armazenamento em ' + Math.round(pct) + '% do limite (' + formatBytes(used) + ' de ' + formatBytes(QUOTA_BYTES[tier]) + ').';
    return msg;
  }
  return null;
}
