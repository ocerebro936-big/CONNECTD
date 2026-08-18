// Connected Fast Engine — Media Worker (OffscreenCanvas)
// Recebe uma imagem + alvos de dimensão e devolve os derivados como Blobs.
/// <reference lib="webworker" />

interface ReqMsg {
  id: string;
  blob: Blob;
  targets: { label: string; width: number }[];
  quality: number;
}

self.onmessage = async (ev: MessageEvent<ReqMsg>) => {
  const { id, blob, targets, quality } = ev.data;
  try {
    const bitmap = await createImageBitmap(blob);
    const out: { label: string; width: number; blob: Blob }[] = [];
    for (const t of targets) {
      if (bitmap.width <= t.width) continue;
      const scale = t.width / bitmap.width;
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(t.width, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(bitmap, 0, 0, t.width, h);
      const type = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const d = (await canvas.convertToBlob({ type, quality })) as Blob;
      out.push({ label: t.label, width: t.width, blob: d });
    }
    bitmap.close();
    (self as any).postMessage({ id, derivatives: out });
  } catch (e: any) {
    (self as any).postMessage({ id, error: String(e?.message || e) });
  }
};
