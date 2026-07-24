/**
 * AWS S3 media storage with optional CloudFront (or custom CDN) public URLs.
 * When configured, uploads go to S3 with long-lived cache headers for fast delivery.
 * Falls back to local disk when AWS is not configured (local/dev).
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type ObjectCannedACL,
} from "@aws-sdk/client-s3";

export interface AwsS3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** CloudFront or custom CDN origin, e.g. https://cdn.celeventic.com */
  publicBaseUrl: string | null;
  /** Optional custom endpoint (MinIO / LocalStack). */
  endpoint: string | null;
  /** When true, objects are written with public-read ACL (bucket policy preferred). */
  publicReadAcl: boolean;
}

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

function resolvePublicBaseUrl(
  cfgPublic?: string | null
): string | null {
  const raw =
    (cfgPublic && cfgPublic.trim()) ||
    trimEnv("AWS_CLOUDFRONT_URL") ||
    trimEnv("AWS_CLOUDFRONT_DOMAIN") ||
    trimEnv("AWS_S3_PUBLIC_BASE_URL") ||
    trimEnv("AWS_S3_PUBLIC_URL") ||
    trimEnv("NEXT_PUBLIC_MEDIA_CDN_URL") ||
    null;
  return raw ? raw.replace(/\/+$/, "") : null;
}

/** Sync env-only config (fast path for health checks). */
export function getAwsS3Config(): AwsS3Config | null {
  const region = trimEnv("AWS_REGION") ?? trimEnv("AWS_DEFAULT_REGION");
  const bucket = trimEnv("AWS_S3_BUCKET");
  const accessKeyId = trimEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = trimEnv("AWS_SECRET_ACCESS_KEY");
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: resolvePublicBaseUrl(),
    endpoint: trimEnv("AWS_S3_ENDPOINT") ?? null,
    publicReadAcl: (trimEnv("AWS_S3_PUBLIC_READ_ACL") ?? "false").toLowerCase() === "true",
  };
}

/**
 * Resolve S3 config from Admin → Integrations (ApiSetting) with env fallback.
 * Config JSON may include: region, bucket, cloudFrontUrl / publicBaseUrl, endpoint.
 */
export async function resolveAwsS3Config(): Promise<AwsS3Config | null> {
  const envCfg = getAwsS3Config();
  try {
    const { getProviderCredentials } = await import("@/lib/integrations/integration-runtime");
    const creds = await getProviderCredentials("AWS_S3");
    if (!creds.enabled && !envCfg) return null;

    const cfg = creds.config ?? {};
    const region =
      (typeof cfg.region === "string" && cfg.region) ||
      trimEnv("AWS_REGION") ||
      trimEnv("AWS_DEFAULT_REGION");
    const bucket =
      (typeof cfg.bucket === "string" && cfg.bucket) || trimEnv("AWS_S3_BUCKET");
    const accessKeyId = creds.publicKey || trimEnv("AWS_ACCESS_KEY_ID");
    const secretAccessKey = creds.secret || trimEnv("AWS_SECRET_ACCESS_KEY");
    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      return envCfg;
    }

    const publicFromCfg =
      (typeof cfg.cloudFrontUrl === "string" && cfg.cloudFrontUrl) ||
      (typeof cfg.publicBaseUrl === "string" && cfg.publicBaseUrl) ||
      null;

    const endpoint =
      (typeof cfg.endpoint === "string" && cfg.endpoint) || trimEnv("AWS_S3_ENDPOINT") || null;

    return {
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl: resolvePublicBaseUrl(publicFromCfg),
      endpoint,
      publicReadAcl:
        cfg.publicReadAcl === true ||
        (trimEnv("AWS_S3_PUBLIC_READ_ACL") ?? "false").toLowerCase() === "true",
    };
  } catch {
    return envCfg;
  }
}

/** True when env has the four required S3 credentials (sync). */
export function isAwsS3Configured(): boolean {
  return getAwsS3Config() !== null;
}

/** Alias — preferred name in call sites / docs. */
export function isS3Enabled(): boolean {
  return isAwsS3Configured();
}

export async function isAwsS3Ready(): Promise<boolean> {
  return (await resolveAwsS3Config()) !== null;
}

/** Healthy when core S3 creds exist; CDN URL is recommended but optional. */
export function getAwsStorageHealth(): {
  configured: boolean;
  hasCdn: boolean;
  message: string;
} {
  const cfg = getAwsS3Config();
  if (!cfg) {
    const partial = !!(
      trimEnv("AWS_REGION") ||
      trimEnv("AWS_ACCESS_KEY_ID") ||
      trimEnv("AWS_SECRET_ACCESS_KEY") ||
      trimEnv("AWS_S3_BUCKET")
    );
    return {
      configured: false,
      hasCdn: false,
      message: partial
        ? "AWS S3 incomplete — local upload fallback until region, keys, and bucket are all set"
        : "AWS S3 not configured — local upload fallback (dev-safe)",
    };
  }
  if (!cfg.publicBaseUrl) {
    return {
      configured: true,
      hasCdn: false,
      message: "AWS S3 configured — add CloudFront / AWS_S3_PUBLIC_BASE_URL for fastest CDN delivery",
    };
  }
  return {
    configured: true,
    hasCdn: true,
    message: "AWS S3 + CDN configured — media uploads use cloud storage",
  };
}

let cachedClient: S3Client | null = null;
let cachedKey: string | null = null;

function getS3Client(cfg: AwsS3Config): S3Client {
  const key = `${cfg.region}|${cfg.accessKeyId}|${cfg.endpoint ?? ""}`;
  if (cachedClient && cachedKey === key) return cachedClient;
  cachedClient = new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    ...(cfg.endpoint
      ? {
          endpoint: cfg.endpoint,
          forcePathStyle: true,
        }
      : {}),
  });
  cachedKey = key;
  return cachedClient;
}

/**
 * Resolve config + a ready S3Client in one call. Used by the video multipart/presign
 * pipeline, which needs direct access to the client for commands not covered by the
 * simple put/get/delete helpers below (multipart, presigning, head).
 */
export async function getConfiguredS3Client(): Promise<{ client: S3Client; cfg: AwsS3Config } | null> {
  const cfg = (await resolveAwsS3Config()) ?? getAwsS3Config();
  if (!cfg) return null;
  return { client: getS3Client(cfg), cfg };
}

function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

export function buildS3ObjectKey(relativePath: string): string {
  const prefix = (trimEnv("AWS_S3_KEY_PREFIX") ?? "uploads").replace(/^\/+|\/+$/g, "");
  const normalized = relativePath.replace(/^\/+/, "").replace(/^uploads\//, "");
  return prefix ? `${prefix}/${normalized}` : normalized;
}

export function publicUrlForS3Key(cfg: AwsS3Config, key: string): string {
  if (cfg.publicBaseUrl) {
    return `${cfg.publicBaseUrl}/${key}`;
  }
  // Virtual-hosted–style URL (works when bucket is public / CloudFront not set yet)
  if (cfg.endpoint) {
    return `${cfg.endpoint.replace(/\/+$/, "")}/${cfg.bucket}/${key}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

/** Alias for publicUrlForS3Key. */
export function getPublicUrl(cfg: AwsS3Config, key: string): string {
  return publicUrlForS3Key(cfg, key);
}

export async function putS3Object(
  relativePath: string,
  buffer: Buffer,
  contentType?: string
): Promise<{ url: string; key: string }> {
  const cfg = (await resolveAwsS3Config()) ?? getAwsS3Config();
  if (!cfg) throw new Error("AWS S3 is not configured");

  const key = buildS3ObjectKey(relativePath);
  const client = getS3Client(cfg);
  const type = contentType ?? contentTypeForKey(key);

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: type,
      CacheControl: "public, max-age=31536000, immutable",
      ...(cfg.publicReadAcl ? { ACL: "public-read" as ObjectCannedACL } : {}),
    })
  );

  return { url: publicUrlForS3Key(cfg, key), key };
}

/** Alias for putS3Object. */
export async function uploadToS3(
  relativePath: string,
  buffer: Buffer,
  contentType?: string
): Promise<{ url: string; key: string }> {
  return putS3Object(relativePath, buffer, contentType);
}

export async function getS3Object(relativePath: string): Promise<Buffer | null> {
  const cfg = (await resolveAwsS3Config()) ?? getAwsS3Config();
  if (!cfg) return null;

  const key = buildS3ObjectKey(relativePath);
  try {
    const client = getS3Client(cfg);
    const out = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    );
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function deleteS3Object(relativePath: string): Promise<boolean> {
  const cfg = (await resolveAwsS3Config()) ?? getAwsS3Config();
  if (!cfg) return false;

  const key = buildS3ObjectKey(relativePath);
  try {
    const client = getS3Client(cfg);
    await client.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function isRemoteMediaHost(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".amazonaws.com")) return true;
    if (u.hostname.endsWith(".cloudfront.net")) return true;
    const cfg = getAwsS3Config();
    if (cfg?.publicBaseUrl) {
      const cdnHost = new URL(cfg.publicBaseUrl).hostname;
      if (u.hostname === cdnHost) return true;
    }
    const publicEnv =
      trimEnv("AWS_CLOUDFRONT_URL") ||
      trimEnv("AWS_S3_PUBLIC_BASE_URL") ||
      trimEnv("AWS_S3_PUBLIC_URL") ||
      trimEnv("NEXT_PUBLIC_MEDIA_CDN_URL");
    if (publicEnv) {
      try {
        if (u.hostname === new URL(publicEnv).hostname) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  } catch {
    return false;
  }
}
