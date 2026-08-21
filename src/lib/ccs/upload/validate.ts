// ============================================================================
// Connected Upload Reliability — Validação pré-upload + limites inteligentes
// ----------------------------------------------------------------------------
// Verifica formato, tamanho, dimensão, duração e proporção ANTES de iniciar o
// upload, e devolve sugestões concretas ("recomendamos comprimir para X") em vez
// de um genérico "ficheiro muito grande". Não bloqueia a app: o chamador decide.
// ============================================================================
import { readMediaMeta, type MediaMeta } from '../media/metadata';

export interface MediaLimit {
  maxBytes: number;
  maxWidth?: number;
  maxHeight?: number;
  maxDurationSec?: number;
  formats: string[];
}

export const MEDIA_LIMITS: Record<'photo' | 'video' | 'audio' | 'document', MediaLimit> = {
  photo: {
    maxBytes: 25 * 1024 * 1024,
    maxWidth: 7680,
    maxHeight: 7680,
    formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp'],
  },
  video: {
    maxBytes: 1024 * 1024 * 1024,
    maxWidth: 3840,
    maxHeight: 2160,
    maxDurationSec: 600,
    formats: ['mp4', 'webm', 'mov', 'm4v', 'mkv'],
  },
  audio: {
    maxBytes: 200 * 1024 * 1024,
    formats: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'],
  },
  document: {
    maxBytes: 100 * 1024 * 1024,
    formats: ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'key', 'odt'],
  },
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  suggestions: string[];
  meta?: MediaMeta;
  recommended?: {
    targetBytes: number;
    maxWidth?: number;
    maxHeight?: number;
    maxDurationSec?: number;
  };
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function validateMediaFile(
  file: File,
  kind: 'photo' | 'video' | 'audio' | 'document'
): Promise<ValidationResult> {
  const errors: string[] = [];
  const suggestions: string[] = [];
  const limit = MEDIA_LIMITS[kind];
  const ext = extOf(file.name);

  // 1. Formato
  if (!limit.formats.includes(ext) && !file.type.startsWith(kind === 'document' ? 'application' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : 'image')) {
    errors.push(`Formato "${ext || file.type || 'desconhecido'}" não suportado para ${kind}.`);
    suggestions.push(`Usa um destes formatos: ${limit.formats.join(', ')}.`);
  }

  // 2. Tamanho bruto
  if (file.size > limit.maxBytes) {
    errors.push(`O ficheiro tem ${fmtMB(file.size)} e o limite é ${fmtMB(limit.maxBytes)}.`);
  } else if (file.size > limit.maxBytes * 0.6) {
    suggestions.push(`Ficheiro grande (${fmtMB(file.size)}). Recomendamos comprimir antes de publicar para carregar mais rápido.`);
  }
  if (file.size === 0) errors.push('O ficheiro está vazio.');

  // 3. Metadados (dimensão/duração)
  let meta: MediaMeta | undefined;
  try {
    meta = await readMediaMeta(file);
  } catch {
    /* metadados opcionais */
  }

  if (meta) {
    const ratio = meta.width && meta.height ? meta.width / meta.height : 0;
    if (kind === 'photo') {
      if (limit.maxWidth && (meta.width || 0) > limit.maxWidth) {
        errors.push(`Resolução ${meta.width}×${meta.height} excede o máximo (${limit.maxWidth}px).`);
      } else if ((meta.width || 0) > 4096 || (meta.height || 0) > 4096) {
        suggestions.push(`Resolução alta (${meta.width}×${meta.height}). Recomendamos reduzir para até 4096px para um upload mais rápido.`);
      }
      if (ratio && (ratio < 0.2 || ratio > 5)) {
        suggestions.push('Proporção muito estreita; alguns dispositivos podem cortar a imagem no Feed.');
      }
    }
    if (kind === 'video') {
      if (limit.maxDurationSec && (meta.duration || 0) > limit.maxDurationSec) {
        errors.push(`Duração ${meta.duration}s excede o máximo de ${limit.maxDurationSec}s.`);
      } else if ((meta.duration || 0) > 60) {
        suggestions.push(`Vídeo longo (${meta.duration}s). Considera dividir ou resumir para melhor retenção.`);
      }
      if (limit.maxWidth && (meta.width || 0) > limit.maxWidth) {
        errors.push(`Resolução ${meta.width}×${meta.height} excede o máximo (${limit.maxWidth}p).`);
      } else if ((meta.width || 0) > 1920) {
        suggestions.push(`Resolução ${meta.width}p. 1080p é suficiente para a Connected e ocupa menos dados.`);
      }
    }
  }

  const recommended =
    errors.length || suggestions.length
      ? {
          targetBytes: Math.min(file.size, Math.round(limit.maxBytes * 0.6)),
          maxWidth: kind === 'photo' ? 4096 : kind === 'video' ? 1920 : undefined,
          maxHeight: kind === 'photo' ? 4096 : kind === 'video' ? 1080 : undefined,
          maxDurationSec: kind === 'video' ? 60 : undefined,
        }
      : undefined;

  return { ok: errors.length === 0, errors, suggestions, meta, recommended };
}
