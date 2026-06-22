import { NextResponse } from "next/server";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { storeMemoryFile, validateMemoryFile } from "@/lib/memory/memory-upload-storage";

const uploadRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = uploadRateMap.get(key);
  if (!entry || entry.resetAt < now) {
    uploadRateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const token = form.get("token") as string | null;
    const uploaderName = (form.get("uploaderName") as string) ?? undefined;
    const uploaderPhone = (form.get("uploaderPhone") as string) ?? undefined;
    const caption = (form.get("caption") as string) ?? undefined;
    const consentGiven = form.get("consent") === "true" || form.get("consentGiven") === "true";
    const file = form.get("file") as File | null;

    if (!token) return NextResponse.json({ error: "Upload token required" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!consentGiven) return NextResponse.json({ error: "Consent is required" }, { status: 400 });

    const tokenRecord = await eventMemoryTokenService.resolveToken(token);
    if (!tokenRecord || tokenRecord.type !== "UPLOAD") {
      return NextResponse.json({ error: "Invalid or expired upload token" }, { status: 403 });
    }

    if (!checkRateLimit(tokenRecord.eventId)) {
      return NextResponse.json({ error: "Upload rate limit exceeded. Try again later." }, { status: 429 });
    }

    const settings = await eventMemorySettingsService.getOrCreate(tokenRecord.eventId);
    const validation = validateMemoryFile(file.type, file.size, settings.maxImageSizeMb, settings.maxVideoSizeMb);
    if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });

    const stored = await storeMemoryFile(tokenRecord.eventId, file);
    const upload = await eventMemoryUploadService.createGuestUpload({
      eventId: tokenRecord.eventId,
      uploaderName,
      uploaderPhone,
      mediaType: stored.mediaType,
      mediaUrl: stored.url,
      caption,
      consentGiven,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: upload.id,
        status: upload.status,
        message: upload.status === "PENDING" ? "Upload received — pending organizer approval" : "Upload successful",
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
