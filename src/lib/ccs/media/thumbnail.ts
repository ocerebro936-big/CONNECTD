// ============================================================================
// Connected Cloud Storage — Thumbnail unificado
// Escolhe o gerador conforme o tipo de média.
// ============================================================================
import { generateVideoThumbnail } from './video';

export async function makeThumbnail(file: File): Promise<Blob | null> {
  if (file.type.startsWith('video/')) return generateVideoThumbnail(file);
  if (file.type.startsWith('image/')) return file;
  return null;
}
