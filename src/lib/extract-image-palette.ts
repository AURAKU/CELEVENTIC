export interface ImagePaletteResult {
  colors: { hex: string; weight: number }[];
  brightness: number;
  aspectRatio: number;
  width: number;
  height: number;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function quantize(value: number, step: number) {
  return Math.round(value / step) * step;
}

export async function extractImagePalette(imageUrl: string): Promise<ImagePaletteResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sampleSize = 80;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const buckets = new Map<string, number>();
      let totalBrightness = 0;
      let pixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        const qr = quantize(r, 24);
        const qg = quantize(g, 24);
        const qb = quantize(b, 24);
        const hex = rgbToHex(qr, qg, qb);
        buckets.set(hex, (buckets.get(hex) ?? 0) + 1);
        totalBrightness += (r + g + b) / (3 * 255);
        pixels++;
      }

      const colors = [...buckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([hex, count]) => ({ hex, weight: count / pixels }));

      resolve({
        colors,
        brightness: pixels ? totalBrightness / pixels : 0.5,
        aspectRatio: img.naturalHeight / img.naturalWidth,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image for analysis"));
    img.src = imageUrl;
  });
}
