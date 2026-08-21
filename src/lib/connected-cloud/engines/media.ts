export interface MediaProcessInput {
  mimeType: string;
  data: Uint8Array;
  key: string;
}

export interface MediaProcessResult {
  thumbnailAvailable: boolean;
  variants: string[];
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface MediaProcessingEngine {
  process(
    input: MediaProcessInput,
  ): Promise<MediaProcessResult>;
}

// Implementação em memória: não transforma bytes (ainda não há FFmpeg
// próprio), mas estabelece o contrato para quando os nós Connected
// tiverem processamento real. O contrato já existe => sem reescrita futura.
export class PassThroughMediaEngine
  implements MediaProcessingEngine {

  async process(
    _input: MediaProcessInput,
  ): Promise<MediaProcessResult> {
    return {
      thumbnailAvailable: false,
      variants: ["original"],
    };
  }
}
