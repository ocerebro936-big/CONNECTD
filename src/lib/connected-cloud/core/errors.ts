export class ConnectedCloudError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);

    this.name = "ConnectedCloudError";
  }
}

export const CloudErrors = {
  INVALID_FILE: "INVALID_FILE",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  CHUNK_INVALID: "CHUNK_INVALID",
  ASSET_NOT_FOUND: "ASSET_NOT_FOUND",
  STORAGE_ERROR: "STORAGE_ERROR",
  CHECKSUM_MISMATCH: "CHECKSUM_MISMATCH",
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const;
