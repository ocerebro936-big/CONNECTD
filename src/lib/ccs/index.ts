// ============================================================================
// Connected King Cloud — Connected Cloud Storage (CCS)
// ----------------------------------------------------------------------------
// Camada de software PRÓPRIA da Connected King, independente da infraestrutura
// física. A aplicação fala sempre "Connected Cloud API"; por baixo pode estar
// Firebase Storage, S3-compatible, MEGA ou servidores dedicados. Trocar o
// fornecedor não obriga a reescrever a app (CCS-Core mantém a mesma interface).
//
//   CONNECTED KING
//        │
//        ▼
//   CONNECTED CLOUD (CCS)
//        ├── Storage  ── Photos / Videos / Audio / Files / Live / TV / AI
//        ├── CDN      ── distribuição global
//        ├── Compute  ── motores autónomos (CCS-*)
//        └── Backup   ── redundância
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Estrutura canónica de objetos (CCS-Core)
// ----------------------------------------------------------------------------
export type CcsNamespace =
  | 'users'
  | 'posts'
  | 'reels'
  | 'messages'
  | 'live'
  | 'tv'
  | 'marketplace'
  | 'system';

export type CcsUserFolder = 'avatar' | 'photos' | 'videos' | 'audio' | 'documents';

/** Constrói uma chave de objeto normalizada segundo a topologia CCS. */
export function ccsKey(parts: string[]): string {
  return parts
    .filter(Boolean)
    .map((p) => p.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/'))
    .join('/');
}

export function ccsUserKey(userId: string, folder: string, filename: string): string {
  return ccsKey(['users', userId, folder, filename]);
}

export function ccsPostKey(postId: string, filename: string): string {
  return ccsKey(['posts', postId, filename]);
}

export function ccsReelKey(reelId: string, filename: string): string {
  return ccsKey(['reels', reelId, filename]);
}

// ----------------------------------------------------------------------------
// 2. Visibilidade e metadados de segurança (CCS-Security)
// ----------------------------------------------------------------------------
export type CcsVisibility =
  | 'public'
  | 'private'
  | 'friends'
  | 'followers'
  | 'group'
  | 'admin'
  | 'system';

export const CCS_VISIBILITY: CcsVisibility[] = [
  'public',
  'private',
  'friends',
  'followers',
  'group',
  'admin',
  'system',
];

export interface CcsObjectMeta {
  ownerId: string;
  mimeType: string;
  visibility: CcsVisibility;
  encrypted?: boolean;
  status?: 'active' | 'processing' | 'deleted' | 'failed';
  checksum?: string;
  size: number;
}

// ----------------------------------------------------------------------------
// 3. Tiers de armazenamento (modelo de receita) — CCS-Billing
// ----------------------------------------------------------------------------
export type CcsTier = 'free' | 'plus' | 'pro' | 'creator' | 'business';

export interface CcsTierDef {
  id: CcsTier;
  label: string;
  gb: number;
  priceUsdMonthly: number;
}

export const CCS_TIERS: CcsTierDef[] = [
  { id: 'free', label: 'Connected King Grátis', gb: 5, priceUsdMonthly: 0 },
  { id: 'plus', label: 'Connected Plus', gb: 50, priceUsdMonthly: 2.99 },
  { id: 'pro', label: 'Connected Pro', gb: 250, priceUsdMonthly: 9.99 },
  { id: 'creator', label: 'Connected Creator', gb: 1024, priceUsdMonthly: 24.99 },
  { id: 'business', label: 'Connected Business', gb: 5120, priceUsdMonthly: 99.99 },
];

export function ccsTierBytes(tier: CcsTier): number {
  const def = CCS_TIERS.find((t) => t.id === tier) || CCS_TIERS[0];
  return def.gb * 1024 * 1024 * 1024;
}

export function ccsTierFromProfile(plan?: string | null): CcsTier {
  switch ((plan || '').toLowerCase()) {
    case 'plus':
      return 'plus';
    case 'pro':
      return 'pro';
    case 'creator':
      return 'creator';
    case 'business':
      return 'business';
    default:
      return 'free';
  }
}

// ----------------------------------------------------------------------------
// 4. Motores da Connected Cloud (CCS-Core / Upload / Media / CDN / Backup /
//    Security / AI / Analytics) — mapeiam para a nossa Engine Registry.
// ----------------------------------------------------------------------------
export type CcsEngineId =
  | 'CCS-Core'
  | 'CCS-Upload'
  | 'CCS-Media'
  | 'CCS-CDN'
  | 'CCS-Backup'
  | 'CCS-Security'
  | 'CCS-AI'
  | 'CCS-Analytics';

export interface CcsEngineDef {
  id: CcsEngineId;
  label: string;
  descricao: string;
  implementado: boolean; // true = já existe na Connected Cloud Core atual
}

export const CCS_ENGINES: CcsEngineDef[] = [
  { id: 'CCS-Core', label: 'CCS-Core', descricao: 'Gestão do armazenamento e do catálogo (cloudAssets).', implementado: true },
  { id: 'CCS-Upload', label: 'CCS-Upload', descricao: 'Uploads autenticados, verificação de tamanho/formato/segurança, retomáveis.', implementado: true },
  { id: 'CCS-Media', label: 'CCS-Media', descricao: 'Processamento de fotos, vídeos e áudio (thumbnail, transcode, waveform).', implementado: true },
  { id: 'CCS-CDN', label: 'CCS-CDN', descricao: 'Distribuição global (cache + edge). Backend via Firebase/CloudFront.', implementado: false },
  { id: 'CCS-Backup', label: 'CCS-Backup', descricao: 'Backups e redundância entre fornecedores.', implementado: true },
  { id: 'CCS-Security', label: 'CCS-Security', descricao: 'Authz, encriptação, antivírus, URLs assinadas, rate-limit, logs.', implementado: true },
  { id: 'CCS-AI', label: 'CCS-AI', descricao: 'Integração com a DIVINO IA (moderação, legendas, tags).', implementado: false },
  { id: 'CCS-Analytics', label: 'CCS-Analytics', descricao: 'Uso de armazenamento e tráfego (quotas, faturação).', implementado: true },
];

// ----------------------------------------------------------------------------
// 5. API da Connected Cloud (contrato estável, independente do fornecedor)
// ----------------------------------------------------------------------------
export const CCS_API_BASE = '/api/v1/storage';

export const CCS_API_ROUTES = {
  upload: 'POST /api/v1/storage/upload',
  getFile: 'GET /api/v1/storage/files/:id',
  deleteFile: 'DELETE /api/v1/storage/files/:id',
  download: 'GET /api/v1/storage/:id/download',
  presigned: 'POST /api/v1/storage/presigned-url',
  transcode: 'POST /api/v1/media/transcode',
  thumbnail: 'POST /api/v1/media/thumbnail',
  stream: 'POST /api/v1/video/stream',
  backup: 'POST /api/v1/backup/create',
  quota: 'GET /api/v1/storage/quota',
} as const;

// ----------------------------------------------------------------------------
// 6. Fases de escalabilidade (infraestrutura física por trás do CCS)
// ----------------------------------------------------------------------------
export const CCS_ROADMAP = [
  'FASE 1 — Connected Cloud sobre infraestrutura cloud existente (Firebase/S3-compatible).',
  'FASE 2 — Servidores dedicados / datacenters parceiros.',
  'FASE 3 — Connected Global Cloud (África, Europa, Ásia, Américas).',
];

// ============================================================================
// Pipeline universal CCS (PR #2) — upload / media / cache / providers
// ============================================================================
export * from './upload';
export * from './media/image';
export * from './media/video';
export * from './media/audio';
export * from './media/thumbnail';
export * from './media/dimensions';
export * from './media/quality';
export * from './media/metadata';
export * from './cache/media-cache';
export * from './providers/connected';
