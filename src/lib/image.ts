/** Resize and compress a meal photo before API upload / sessionStorage. */

export async function compressImageForAnalysis(
  source: File | string,
  maxEdge = 1280,
  quality = 0.82,
): Promise<string> {
  const dataUrl = typeof source === "string" ? source : await readFileAsDataUrl(source);

  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return ensureJpegDataUrl(dataUrl);

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch (err) {
    // Already a browser-decodable JPEG/PNG/WebP — skip resize rather than fail the flow.
    if (isRasterDataUrl(dataUrl)) {
      return dataUrl;
    }
    throw err instanceof Error
      ? err
      : new Error("Failed to load image");
  }
}

/** Fetch a Capacitor webPath / blob URL into a data URL. */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to read photo");
  const blob = await res.blob();
  return readBlobAsDataUrl(blob);
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  // iOS often omits MIME for HEIC / library picks
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i.test(file.name);
}

function isRasterDataUrl(dataUrl: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp|gif|bmp)/i.test(dataUrl);
}

function ensureJpegDataUrl(dataUrl: string): string {
  return isRasterDataUrl(dataUrl) ? dataUrl : dataUrl;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return readBlobAsDataUrl(file);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
