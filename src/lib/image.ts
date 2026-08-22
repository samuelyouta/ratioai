/** Resize / compress meal photos. Never throws away an already-usable JPEG. */

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

export async function compressImageForAnalysis(
  source: File | string,
  maxEdge = MAX_EDGE,
  quality = JPEG_QUALITY,
): Promise<string> {
  const dataUrl = typeof source === "string" ? source : await readBlobAsDataUrl(source);

  // Already a compact JPEG — skip canvas work (avoids WKWebView decode quirks).
  if (isJpegDataUrl(dataUrl) && dataUrl.length < 900_000) {
    return dataUrl;
  }

  try {
    const bitmap = await decodeToBitmap(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      closeBitmap(bitmap);
      return preferUsableDataUrl(dataUrl);
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    closeBitmap(bitmap);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return preferUsableDataUrl(dataUrl);
  }
}

export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to read photo");
  return readBlobAsDataUrl(await res.blob());
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i.test(file.name);
}

function preferUsableDataUrl(dataUrl: string): string {
  if (isRasterDataUrl(dataUrl)) return dataUrl;
  throw new Error(
    "Couldn't decode that photo. Try a screenshot, or take a new photo with the camera.",
  );
}

function isJpegDataUrl(dataUrl: string): boolean {
  return /^data:image\/(jpeg|jpg);base64,/i.test(dataUrl);
}

function isRasterDataUrl(dataUrl: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp|gif|bmp);base64,/i.test(dataUrl);
}

async function decodeToBitmap(dataUrl: string): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap handles more formats more reliably than new Image() on iOS.
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch {
    return loadHtmlImage(dataUrl);
  }
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement) {
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}
