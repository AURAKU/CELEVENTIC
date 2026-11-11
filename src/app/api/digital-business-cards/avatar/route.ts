import { NextResponse } from "next/server";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { looksLikeSvg, sniffImageFormat } from "@/lib/media/image-processor";
import {
  CELECARD_LOGO_MAX_EDGE,
  CELECARD_LOGO_WEBP_QUALITY,
  CELECARD_PORTRAIT_MAX_EDGE,
  CELECARD_PORTRAIT_WEBP_QUALITY,
} from "@/lib/digital-business-card/portraits";

const MAX_BYTES = 12 * 1024 * 1024;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const purpose = String(form.get("purpose") || "").toLowerCase();
    const isLogo = purpose === "logo";
    const isPaper = purpose === "paper";
    const empty = isLogo ? "Choose a company logo." : isPaper ? "Choose a background image." : "Choose a portrait photo.";
    const tooBig = isLogo ? "Logo must be under 12MB." : isPaper ? "Background must be under 12MB." : "Portrait must be under 12MB.";
    const badType = isLogo
      ? "Use PNG, JPEG, WebP, or SVG with a clear mark."
      : isPaper
        ? "Use a photo or texture. JPEG, HEIC, PNG, or WebP."
        : "Use a photo. JPEG, HEIC, PNG, WebP, GIF, or AVIF.";
    const unread = isLogo
      ? "We couldn't read that logo. Try PNG, JPEG, or WebP."
      : isPaper
        ? "We couldn't read that background. Try JPEG, HEIC, PNG, or WebP."
        : "We couldn't read that photo. Try JPEG, HEIC, PNG, or WebP.";

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: empty }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: tooBig }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const svg = looksLikeSvg(buffer);
    if (svg && !isLogo) {
      return NextResponse.json({ error: badType }, { status: 400 });
    }

    const sniffed = sniffImageFormat(buffer);
    if (!sniffed && !svg) {
      try {
        const probe = await sharp(buffer, { failOn: "error", animated: false }).metadata();
        if (!probe.format || probe.format === "svg") {
          return NextResponse.json({ error: unread }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: unread }, { status: 400 });
      }
    }

    let out: Buffer;
    try {
      const pipeline = svg
        ? sharp(buffer, { density: 320, failOn: "error" })
        : sharp(buffer, { failOn: "error", animated: false }).rotate();
      const edge = isLogo ? CELECARD_LOGO_MAX_EDGE : CELECARD_PORTRAIT_MAX_EDGE;
      const quality = isLogo ? CELECARD_LOGO_WEBP_QUALITY : isPaper ? 88 : CELECARD_PORTRAIT_WEBP_QUALITY;
      out = await pipeline
        .resize(edge, edge, {
          fit: "inside",
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
          background: TRANSPARENT,
        })
        .webp(
          isLogo
            ? { quality, alphaQuality: 100, effort: 4 }
            : { quality, alphaQuality: 100, smartSubsample: true, effort: 4, preset: "photo" }
        )
        .toBuffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (sniffed === "heic" || /heif|heic/i.test(message)) {
        return NextResponse.json(
          {
            error: isLogo
              ? "We couldn't process this logo. Export it as PNG and try again."
              : "We couldn't process this iPhone photo. Export it as JPEG and try again.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: unread }, { status: 400 });
    }

    const folder = isLogo ? "celecard-logos" : isPaper ? "celecard-papers" : "celecard-avatars";
    const safeName = `${isLogo ? "logo-" : isPaper ? "paper-" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const { url } = await storeUploadFile(folder, session.user.id, safeName, out);
    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
