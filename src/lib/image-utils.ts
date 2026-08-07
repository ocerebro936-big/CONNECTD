export interface CompressOptions {
  maxDim?: number;
  quality?: number;
}

export const compressImage = (file: File, opts: CompressOptions = {}): Promise<string> => {
  const { maxDim = 1920, quality = 0.82 } = opts;
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const out = canvas.toDataURL('image/jpeg', quality);
      const kb = Math.round((out.length - out.indexOf(',') - 1) * 0.75 / 1024);
      if (kb > 900 && quality > 0.5) {
        resolve(canvas.toDataURL('image/jpeg', quality - 0.15));
      } else {
        resolve(out);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
};
