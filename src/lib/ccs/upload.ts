// ============================================================================
// Connected Cloud Storage — Compatibilidade (back-compat)
// O pipeline real vive em ./upload/*. Mantemos este ficheiro para não quebrar
// os imports existentes (ProfilePage, FeedPage, CcsUploader).
// ============================================================================
export type {
  CcsFolder,
  CcsUploadKind,
  CcsUploadInput,
  CcsUploadResult,
  CcsDerivative,
  CcsVisibility,
} from './upload/types';

export {
  ccsUpload,
  ccsUpload as uploadToCcs,
  ccsFolderForKind,
} from './upload/uploader';

export { withRetry } from './upload/retry';
export { uploadResumable } from './upload/chunk-upload';
