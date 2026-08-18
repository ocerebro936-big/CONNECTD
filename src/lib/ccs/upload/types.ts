// ============================================================================
// Connected Cloud Storage — Universal Upload (tipos)
// ============================================================================
import type { CcsVisibility } from '../../ccs';

export type CcsFolder =
  | 'avatar'
  | 'cover'
  | 'photos'
  | 'videos'
  | 'audio'
  | 'documents'
  | 'gallery'
  | 'stories'
  | 'chat'
  | 'tv'
  | 'marketplace';

export type CcsUploadKind =
  | 'avatar'
  | 'cover'
  | 'photo'
  | 'image'
  | 'video'
  | 'reel'
  | 'audio'
  | 'pdf'
  | 'slides'
  | 'document'
  | 'gallery';

export type { CcsVisibility } from '../../ccs';

export interface CcsUploadInput {
  ownerUid: string;
  ownerName?: string;
  file: File;
  folder: CcsFolder;
  kind: CcsUploadKind;
  postId?: string;
  assetId?: string;
  visibility?: CcsVisibility;
  user?: any;
  profileData?: any;
  onProgress?: (fraction: number) => void;
  /** Gera derivados (large/medium/small/thumbnail) para imagens. */
  generateDerivatives?: boolean;
  signal?: AbortSignal;
}

export interface CcsDerivative {
  label: 'original' | 'large' | 'medium' | 'small' | 'thumbnail';
  width: number;
  url: string;
  sizeBytes: number;
}

export interface CcsUploadResult {
  url: string;
  assetId: string;
  key: string;
  file: File;
  thumbnailUrl?: string;
  derivatives?: CcsDerivative[];
}
