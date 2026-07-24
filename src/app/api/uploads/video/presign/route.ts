import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveUploadPrincipal, UploadAuthError } from "@/lib/video/principal";
import { checkUploadRateLimit, checkDailyUploadQuota } from "@/lib/video/quota";
import { getVideoCategoryLimits, categoryMaxBytes } from "@/lib/video/limits";
import { validateVideoDescriptor, extractExtension } from "@/lib/video/validation";
import { buildRawVideoKey, sanitizeDisplayFilename } from "@/lib/video/key-builder";
import { isVideoCategory, MULTIPART_THRESHOLD_BYTES, PRESIGN_EXPIRY_SECONDS } from "@/lib/video/constants";
import { EXTENSION_MIME_MAP } from "@/lib/video/constants";
import { presignPutObject, isVideoStorageReady, VideoStorageNotConfiguredError } from "@/lib/video/s3-video";
import { vendorPlanService } from "@/services/vendor-os/vendor-plan.service";

interface PresignRequestBody {
  category?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  eventId?: string;
  vendorId?: string;
  orderId?: string;
  guestToken?: string;
  guestName?: string;
  guestPhone?: string;
  context?: { role?: string; mute?: boolean };
}

export async function POST(req: Request) {
  let body: PresignRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isVideoCategory(body.category)) {
    return NextResponse.json({ error: "Invalid or missing video category." }, { status: 400 });
  }
  if (!body.filename || !body.mimeType || typeof body.sizeBytes !== "number") {
    return NextResponse.json({ error: "filename, mimeType, and sizeBytes are required." }, { status: 400 });
  }

  const provider = (process.env.MEDIA_STORAGE_PROVIDER ?? "s3").trim().toLowerCase();
  if (provider !== "s3") {
    return NextResponse.json(
      { error: "The direct-to-cloud video pipeline is disabled on this environment (MEDIA_STORAGE_PROVIDER is not s3)." },
      { status: 503 }
    );
  }

  if (!(await isVideoStorageReady())) {
    return NextResponse.json(
      { error: "Video storage is not configured on this environment. Contact an administrator." },
      { status: 503 }
    );
  }

  let principal;
  try {
    principal = await resolveUploadPrincipal({
      category: body.category,
      eventId: body.eventId,
      vendorId: body.vendorId,
      orderId: body.orderId,
      guestToken: body.guestToken,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
    });
  } catch (error) {
    if (error instanceof UploadAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const rate = await checkUploadRateLimit("presign", principal.ownerId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Please slow down and try again shortly." },
      { status: 429, headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined }
    );
  }

  const limits = await getVideoCategoryLimits(body.category);
  const maxBytes = categoryMaxBytes(limits);

  const descriptorCheck = validateVideoDescriptor(
    { filename: body.filename, mimeType: body.mimeType, sizeBytes: body.sizeBytes },
    maxBytes
  );
  if (!descriptorCheck.valid) {
    return NextResponse.json({ error: descriptorCheck.reason }, { status: 400 });
  }

  const quotaCheck = await checkDailyUploadQuota(principal.ownerId, body.sizeBytes);
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.reason }, { status: 429 });
  }

  if (body.category === "VENDOR_PORTFOLIO" && principal.vendorId) {
    const vendorCheck = await vendorPlanService.canUpload(principal.vendorId, "video", body.sizeBytes);
    if (!vendorCheck.allowed) {
      return NextResponse.json({ error: vendorCheck.reason }, { status: 403 });
    }
  }

  const extension = descriptorCheck.extension!;
  const { key, id } = buildRawVideoKey(body.category, principal.ownerId, extension);
  const contentType = EXTENSION_MIME_MAP[extension] ?? "application/octet-stream";
  const safeFilename = sanitizeDisplayFilename(body.filename);

  const context: Record<string, unknown> = { ...principal.context };
  if (body.context?.role) context.role = String(body.context.role).slice(0, 40);
  if (body.category === "INVITATION_BACKGROUND" && body.context?.mute) context.mute = true;

  const asset = await prisma.videoAsset.create({
    data: {
      id,
      category: body.category,
      status: "UPLOADING",
      ownerType: principal.ownerType,
      ownerId: principal.ownerId,
      eventId: principal.eventId,
      vendorId: principal.vendorId,
      orderId: body.orderId ?? null,
      context: context as Prisma.InputJsonValue,
      originalKey: key,
      originalFilename: safeFilename,
      originalMimeType: body.mimeType,
      originalExtension: extension,
      sizeBytes: BigInt(Math.round(body.sizeBytes)),
    },
  });

  const useMultipart = body.sizeBytes >= MULTIPART_THRESHOLD_BYTES;

  try {
    if (!useMultipart) {
      const { url } = await presignPutObject(key, contentType, PRESIGN_EXPIRY_SECONDS);
      return NextResponse.json({
        success: true,
        data: {
          assetId: asset.id,
          strategy: "single",
          uploadUrl: url,
          key,
          expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        assetId: asset.id,
        strategy: "multipart",
        key,
      },
    });
  } catch (error) {
    await prisma.videoAsset.update({ where: { id: asset.id }, data: { status: "FAILED", failureReason: "Could not generate an upload URL." } });
    if (error instanceof VideoStorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
