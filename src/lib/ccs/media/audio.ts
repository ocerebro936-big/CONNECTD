// ============================================================================
// Connected Cloud Storage — Processamento de áudio
// Lê metadados básicos (duração) e produz picos (waveform) para visualização.
// ============================================================================

export interface AudioMeta {
  duration: number;
  peaks: number[];
  sampleRate?: number;
}

export async function readAudioMetadata(file: Blob, peakCount = 64): Promise<AudioMeta> {
  const arrayBuffer = await file.slice(0, Math.min(file.size, 5 * 1024 * 1024)).arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuf.getChannelData(0);
    const block = Math.max(1, Math.floor(channel.length / peakCount));
    const peaks: number[] = [];
    for (let i = 0; i < peakCount; i++) {
      let max = 0;
      const start = i * block;
      for (let j = 0; j < block; j++) {
        const v = Math.abs(channel[start + j] || 0);
        if (v > max) max = v;
      }
      peaks.push(Number(max.toFixed(4)));
    }
    return { duration: audioBuf.duration, peaks, sampleRate: audioBuf.sampleRate };
  } catch {
    return { duration: 0, peaks: new Array(peakCount).fill(0) };
  } finally {
    ctx.close().catch(() => {});
  }
}
