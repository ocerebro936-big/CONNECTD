// ============================================================================
// Connected — Topologia Oficial dos Servidores (Connected Server Stack)
// ----------------------------------------------------------------------------
// Filosofia: "Um servidor pode falhar. A Connected não."
// Cada servidor é substituível sem derrubar a plataforma. O software é
// agnóstico ao fornecedor (ver cloud-storage/provider.ts), pelo que podemos
// começar em Cloud gerida e migrar para servidores dedicados no futuro.
// ============================================================================

export interface ServerNode {
  id: string;
  role: string;
  responsibilities: string[];
  currentImpl: string; // onde vive hoje (Firebase gerido)
  futureImpl: string; // servidor dedicado pretendido
}

export const SERVER_STACK: ServerNode[] = [
  {
    id: 'CON-APP',
    role: 'Aplicações',
    responsibilities: ['Feed', 'Perfis', 'Posts', 'Follow', 'Connect', 'Notificações', 'API'],
    currentImpl: 'Firebase Hosting + Client SDK (React)',
    futureImpl: 'Docker + Nginx/Reverse Proxy + Node.js/TypeScript',
  },
  {
    id: 'CON-DATA',
    role: 'Base de dados',
    responsibilities: ['Core', 'Social', 'Media', 'Business', 'Economy'],
    currentImpl: 'Cloud Firestore',
    futureImpl: 'PostgreSQL (Core/Social/Economy) + fila de migração',
  },
  {
    id: 'CON-CACHE',
    role: 'Cache / Sessões',
    responsibilities: ['Sessões', 'Cache', 'Rate limiting', 'Contadores', 'Dados temporários'],
    currentImpl: 'LocalStorage + CDN (client-side)',
    futureImpl: 'Redis',
  },
  {
    id: 'CON-MEDIA',
    role: 'Processamento de média',
    responsibilities: ['Vídeo: transcoding/thumbnail/streaming', 'Áudio: waveform/streaming'],
    currentImpl: 'Client-side (canvas/WebAudio) + Cloud Storage',
    futureImpl: 'Workers + FFmpeg + encoders',
  },
  {
    id: 'CON-WORKER',
    role: 'Motorizinhos autónomos',
    responsibilities: ['Storage', 'Backup', 'SEO', 'Notification', 'Media', 'Security', 'Health', 'Discovery'],
    currentImpl: 'Connected Cloud Core (motores no cliente + intervalo)',
    futureImpl: 'Cloud Functions / filas (Pub/Sub)',
  },
  {
    id: 'CON-SEC',
    role: 'Segurança',
    responsibilities: ['Firewall', 'WAF', 'Audit Logs', 'IDS', 'Rate Limiting', 'Access Control', 'Monitoring'],
    currentImpl: 'Firestore/Storage Rules + Security Engine + RBAC',
    futureImpl: 'WAF + SIEM + rotação de credenciais',
  },
];

export const DATABASE_SCHEMA = {
  core: ['users', 'profiles', 'sessions', 'devices', 'settings'],
  social: ['posts', 'comments', 'likes', 'follows', 'connections', 'notifications', 'messages'],
  media: ['media', 'music', 'videos', 'playlists', 'tv_channels'],
  business: ['businesses', 'advertisers', 'campaigns', 'contracts', 'invoices'],
  economy: ['points_ledger', 'wallets', 'transactions', 'rewards'],
  // ficheiros NUNCA no PostgreSQL: só metadata; o binário vive no Connected Storage
  storageMeta: ['media_id', 'owner_id', 'storage_key', 'type', 'size', 'checksum', 'visibility'],
};

export function getServer(id: string): ServerNode | undefined {
  return SERVER_STACK.find((s) => s.id === id);
}

// ============================================================================
// Connected King Cloud — Connected Cloud Storage (CCS)
// ----------------------------------------------------------------------------
// Camada de software própria por cima de qualquer object storage. A app fala
// "Connected Cloud API"; a infraestrutura física (Firebase/S3-compatible/MEGA)
// é trocável sem reescrever a Connected King.
// ============================================================================
export const CCS_TOPOLOGY = {
  namespace: 'connected-cloud',
  estrutura: [
    'users/{userId}/{avatar|photos|videos|audio|documents}',
    'posts/{postId}',
    'reels/{reelId}',
    'messages',
    'live',
    'tv',
    'marketplace',
    'system',
  ],
  motores: ['CCS-Core', 'CCS-Upload', 'CCS-Media', 'CCS-CDN', 'CCS-Backup', 'CCS-Security', 'CCS-AI', 'CCS-Analytics'],
  camadas: ['Storage (Photos/Videos/Audio/Files/Live/TV/AI)', 'CDN (distribuição global)', 'Compute (motores)', 'Backup (redundância)'],
  roadmap: [
    'FASE 1 — Connected Cloud sobre infraestrutura cloud existente (Firebase/S3-compatible).',
    'FASE 2 — Servidores dedicados / datacenters parceiros.',
    'FASE 3 — Connected Global Cloud (África, Europa, Ásia, Américas).',
  ],
};
