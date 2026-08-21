export type CloudAssetStatus =
  | "DRAFT"
  | "UPLOADING"
  | "PROCESSING"
  | "READY"
  | "PUBLISHED"
  | "FAILED"
  | "DELETING"
  | "DELETED";

export type CloudVisibility =
  | "public"
  | "private"
  | "friends"
  | "followers"
  | "group"
  | "admin"
  | "system";

export interface CloudAsset {
  assetId: string;
  ownerId: string;

  key: string;

  size: number;
  mimeType: string;
  checksum: string;

  visibility: CloudVisibility;
  status: CloudAssetStatus;

  version: number;

  createdAt: string;
  updatedAt: string;

  metadata: Record<string, string>;
}

export interface UploadSession {
  sessionId: string;

  assetId: string;
  ownerId: string;

  key: string;

  totalSize: number;
  chunkSize: number;

  uploadedBytes: number;

  status:
    | "created"
    | "uploading"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

  createdAt: string;
  updatedAt: string;
}

export interface CloudEvent {
  eventId: string;

  type: string;

  timestamp: string;

  actorId?: string;
  resourceId?: string;

  requestId: string;

  result: "success" | "failure";

  metadata?: Record<string, unknown>;
}
