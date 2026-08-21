export * from "./core/types";
export * from "./core/errors";
export * from "./core/events";
export * from "./core/cloud";

export * from "./storage/object-store";
export * from "./storage/checksum";
export * from "./storage/dedup";
export * from "./storage/sessions";
export * from "./storage/chunks";

export * from "./health/health";

export * from "./validation/validator";

export * from "./engines";
export * from "./engines/upload";
export * from "./engines/download";
export * from "./engines/chunk";
export * from "./engines/resume";
export * from "./engines/metadata";
export * from "./engines/media";
export * from "./engines/cache";
export * from "./engines/traffic";
export * from "./engines/security";
export * from "./engines/backup";
export * from "./engines/recovery";
export * from "./engines/health";
export * from "./node";

import { createMemoryEngines } from "./engines";
import { ConnectedCloud } from "./core/cloud";

// Único ponto de contacto da app com a Connected Cloud.
// (provider-agnóstico: hoje em memória; amanhã S3/MEGA/nó próprio)
export const connectedCloud = new ConnectedCloud(
  createMemoryEngines(),
);
