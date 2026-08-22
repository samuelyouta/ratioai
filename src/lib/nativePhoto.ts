import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

/** Convert a Capacitor photo result into a JPEG data URL. */
export async function photoToDataUrl(photo: {
  dataUrl?: string;
  base64String?: string;
  webPath?: string;
  format?: string;
}): Promise<string> {
  if (photo.dataUrl?.startsWith("data:image/")) {
    return photo.dataUrl;
  }

  if (photo.base64String) {
    const format = (photo.format || "jpeg").replace("jpg", "jpeg");
    return `data:image/${format};base64,${photo.base64String}`;
  }

  if (photo.webPath) {
    const path = Capacitor.convertFileSrc
      ? Capacitor.convertFileSrc(photo.webPath)
      : photo.webPath;
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to read photo from library");
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  }

  throw new Error("No image data returned from camera/gallery");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read photo"));
    reader.readAsDataURL(blob);
  });
}

export async function pickGalleryPhoto(): Promise<string | null> {
  const perm = await Camera.requestPermissions({ permissions: ["photos"] });
  if (perm.photos !== "granted" && perm.photos !== "limited") {
    throw new Error("Photo access is off. Enable Photos for RatioAi in Settings.");
  }

  try {
    // Uri is more reliable than DataUrl for large Camera Roll assets on iOS.
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 1280,
      height: 1280,
      correctOrientation: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });
    return await photoToDataUrl(photo);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(message)) return null;

    // Fallback: Base64 (native converts HEIC → JPEG)
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1280,
        height: 1280,
        correctOrientation: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      return await photoToDataUrl(photo);
    } catch (e2) {
      const message2 = e2 instanceof Error ? e2.message : String(e2);
      if (/cancel/i.test(message2)) return null;
      throw e2;
    }
  }
}

export async function captureCameraPhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 1280,
      height: 1280,
      correctOrientation: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    return await photoToDataUrl(photo);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(message)) return null;
    throw e;
  }
}
