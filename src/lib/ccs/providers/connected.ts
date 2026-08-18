// ============================================================================
// Connected Cloud Storage — Provider "Connected" (CCS-Core)
// Entrada agnóstica da Connected Cloud API. Por enquanto suportado pelo
// Firebase Storage; no futuro substituível por infraestrutura própria sem
// tocar no frontend (apenas trocar o provider concreto).
// ============================================================================
export { connectedStorage } from '../../cloud-storage/provider';
export { createStorageProvider } from '../../cloud-storage/provider';
export type { StorageProvider, StorageObject, StorageObjectMeta } from '../../cloud-storage/provider';
export { ConnectedStorage } from '../../cloud-storage/provider';
