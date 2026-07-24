import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfiguredS3Client } from "@/lib/uploads/aws-s3";
import { PRESIGN_EXPIRY_SECONDS } from "@/lib/video/constants";

export class VideoStorageNotConfiguredError extends Error {
  constructor() {
    super(
      "AWS S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY (or configure the AWS_S3 integration in Admin) before using the video upload pipeline."
    );
    this.name = "VideoStorageNotConfiguredError";
  }
}

async function requireS3() {
  const s3 = await getConfiguredS3Client();
  if (!s3) throw new VideoStorageNotConfiguredError();
  return s3;
}

export async function isVideoStorageReady(): Promise<boolean> {
  return (await getConfiguredS3Client()) !== null;
}

export async function presignPutObject(
  key: string,
  contentType: string,
  expiresInSeconds: number = PRESIGN_EXPIRY_SECONDS
): Promise<{ url: string; bucket: string }> {
  const { client, cfg } = await requireS3();
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { url, bucket: cfg.bucket };
}

export async function createMultipartUpload(
  key: string,
  contentType: string
): Promise<{ uploadId: string; bucket: string }> {
  const { client, cfg } = await requireS3();
  const out = await client.send(
    new CreateMultipartUploadCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType })
  );
  if (!out.UploadId) throw new Error("S3 did not return a multipart upload id");
  return { uploadId: out.UploadId, bucket: cfg.bucket };
}

export async function presignUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds: number = PRESIGN_EXPIRY_SECONDS
): Promise<string> {
  const { client, cfg } = await requireS3();
  const command = new UploadPartCommand({
    Bucket: cfg.bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function listUploadedParts(
  key: string,
  uploadId: string
): Promise<{ partNumber: number; etag: string; sizeBytes: number }[]> {
  const { client, cfg } = await requireS3();
  const parts: { partNumber: number; etag: string; sizeBytes: number }[] = [];
  let marker: string | undefined;
  for (;;) {
    const out = await client.send(
      new ListPartsCommand({ Bucket: cfg.bucket, Key: key, UploadId: uploadId, PartNumberMarker: marker })
    );
    for (const p of out.Parts ?? []) {
      if (p.PartNumber && p.ETag) {
        parts.push({ partNumber: p.PartNumber, etag: p.ETag, sizeBytes: p.Size ?? 0 });
      }
    }
    if (!out.IsTruncated || !out.NextPartNumberMarker) break;
    marker = out.NextPartNumberMarker;
  }
  return parts;
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<{ location?: string }> {
  const { client, cfg } = await requireS3();
  const completedParts: CompletedPart[] = parts
    .slice()
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }));

  const out = await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: completedParts },
    })
  );
  return { location: out.Location };
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const { client, cfg } = await requireS3();
  try {
    await client.send(new AbortMultipartUploadCommand({ Bucket: cfg.bucket, Key: key, UploadId: uploadId }));
  } catch {
    // Best-effort — S3 auto-expires incomplete multipart uploads via lifecycle rules too.
  }
}

export interface VideoHeadInfo {
  exists: boolean;
  sizeBytes: number;
  contentType: string | null;
  etag: string | null;
}

export async function headVideoObject(key: string): Promise<VideoHeadInfo> {
  const { client, cfg } = await requireS3();
  try {
    const out = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
    return {
      exists: true,
      sizeBytes: out.ContentLength ?? 0,
      contentType: out.ContentType ?? null,
      etag: out.ETag ?? null,
    };
  } catch {
    return { exists: false, sizeBytes: 0, contentType: null, etag: null };
  }
}

/** Fetch a whole object — used by the FFmpeg (VPS) processing path to download the raw upload for transcoding. */
export async function getFullVideoObject(key: string): Promise<Buffer | null> {
  const { client, cfg } = await requireS3();
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

/** Upload a processed output (MP4 / poster JPEG) back to the video bucket — used by the FFmpeg processing path. */
export async function putVideoObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const { client, cfg } = await requireS3();
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

/** Fetch a byte range of the object — used for magic-byte signature sniffing and MP4 metadata parsing. */
export async function getVideoObjectRange(key: string, start: number, endInclusive: number): Promise<Buffer | null> {
  const { client, cfg } = await requireS3();
  try {
    const out = await client.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key, Range: `bytes=${start}-${endInclusive}` })
    );
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function deleteVideoObject(key: string): Promise<void> {
  const { client, cfg } = await requireS3();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  } catch {
    // best-effort
  }
}

export async function getVideoBucketName(): Promise<string> {
  const { cfg } = await requireS3();
  return cfg.bucket;
}

export async function getVideoPublicBaseUrl(): Promise<string | null> {
  const s3 = await getConfiguredS3Client();
  return s3?.cfg.publicBaseUrl ?? null;
}

/**
 * Build the CDN-facing URL for a processed (non-raw) key. Processed output should always be
 * served through CloudFront in production — this only falls back to a virtual-hosted S3 URL
 * for local/dev setups that haven't configured a CDN yet.
 */
export async function buildPublicVideoUrl(key: string): Promise<string> {
  const { cfg } = await requireS3();
  if (cfg.publicBaseUrl) return `${cfg.publicBaseUrl}/${key}`;
  if (cfg.endpoint) return `${cfg.endpoint.replace(/\/+$/, "")}/${cfg.bucket}/${key}`;
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}
