/** Upload FormData with optional progress reporting (XHR — fetch lacks upload progress). */
export async function uploadFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        json = { error: "Invalid response" };
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export const CLIENT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const CLIENT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function validateClientImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file (JPEG, PNG, WebP).";
  if (file.size > CLIENT_MAX_IMAGE_BYTES) return "Image too large. Max 10MB.";
  return null;
}

export function validateClientVideo(file: File): string | null {
  if (!file.type.startsWith("video/")) return "Please choose a video file (MP4 or WebM).";
  if (file.size > CLIENT_MAX_VIDEO_BYTES) return "Video too large. Max 50MB.";
  return null;
}
