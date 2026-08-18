// ============================================================================
// Connected Cloud Core — Audio Engine (client-side)
// ----------------------------------------------------------------------------
// Extrai waveform (picos) de um áudio para o player e metadados do Connected
// Music. O arquivo original permanece armazenado separadamente.
// ============================================================================
export async function generateWaveform(file: File, buckets = 64): Promise<number[]> {
  const buf = await file.arrayBuffer();
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const audio = new Ctx();
  try {
    const audioBuf = await audio.decodeAudioData(buf);
    const data = audioBuf.getChannelData(0);
    const step = Math.floor(data.length / buckets) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let min = 1;
      let max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      peaks.push(Math.max(Math.abs(min), Math.abs(max)));
    }
    const norm = Math.max(...peaks, 1e-6);
    return peaks.map((p) => p / norm);
  } finally {
    audio.close?.();
  }
}

export async function readAudioDuration(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const audio = new Ctx();
  try {
    const audioBuf = await audio.decodeAudioData(buf);
    return Math.round(audioBuf.duration);
  } finally {
    audio.close?.();
  }
}
