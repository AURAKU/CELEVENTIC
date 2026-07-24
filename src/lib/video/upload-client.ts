"use client";

/** Client-side (browser-only) helpers for the direct-to-S3 multipart video upload flow. */

export interface XhrProgressResult {
  status: number;
  etag: string | null;
  responseText: string;
}

export function xhrPutWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (loaded: number, total: number) => void,
  registerAbort: (abort: () => void) => void
): Promise<XhrProgressResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);

    registerAbort(() => xhr.abort());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, etag: xhr.getResponseHeader("ETag"), responseText: xhr.responseText });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    xhr.send(body);
  });
}

/**
 * POST a FormData body (used by the local-disk fallback upload) with upload progress and an
 * `uploadComplete` hook — fires once all bytes are sent, while the server is still processing
 * (transcoding) and the response hasn't arrived yet, so the caller can flip its UI from
 * "uploading" to "processing" instead of looking stuck at 100%.
 */
export function xhrPostFormWithProgress<T>(
  url: string,
  form: FormData,
  onProgress: (loaded: number, total: number) => void,
  registerAbort: (abort: () => void) => void,
  onUploadComplete?: () => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    registerAbort(() => xhr.abort());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.upload.onload = () => onUploadComplete?.();

    xhr.onload = () => {
      let json: unknown = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error body — fall through to status-based handling below */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json as T);
      } else {
        reject(new Error((json as { error?: string })?.error ?? `Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    xhr.send(form);
  });
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Small bounded-concurrency runner — used to upload multiple S3 parts in parallel without overwhelming the browser/network. */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  let firstError: unknown = null;

  async function runNext(): Promise<void> {
    while (index < items.length) {
      const current = items[index++];
      try {
        await worker(current);
      } catch (error) {
        firstError = firstError ?? error;
        throw error;
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(runners).catch((error) => {
    if (!firstError) firstError = error;
  });
  if (firstError) throw firstError;
}
