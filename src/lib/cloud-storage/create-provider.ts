import { ConnectedCloudProvider, type StorageProvider } from "./provider";

// Cria um StorageProvider. O único caminho oficial é a Connected Cloud
// (Gateway de objetos real). Não há Firebase Storage nem fallback silencioso.
export function createStorageProvider(kind: "connected" = "connected"): StorageProvider {
  if (kind !== "connected") {
    throw new Error("Apenas o provider 'connected' (Connected Cloud) é suportado.");
  }
  return new ConnectedCloudProvider();
}
