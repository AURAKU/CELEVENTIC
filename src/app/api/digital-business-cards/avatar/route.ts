import { NextResponse } from "next/server";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { looksLikeSvg, sniffImageFormat } from "@/lib/media/image-processor";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a portrait photo." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Portrait must be under 12MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (looksLikeSvg(buffer)) {
      return NextResponse.json(
        { error: "Use a photo. JPEG, HEIC, PNG, WebP, GIF, or AVIF." },
        { status: 400 }
      );
    }

    const sniffed = sniffImageFormat(buffer);
    if (!sniffed) {
      try {
        const probe = await sharp(buffer, { failOn: "error", animated: false }).metadata();
        if (!probe.format || probe.format === "svg") {
          return NextResponse.json(
            { error: "We couldn't read that photo. Try JPEG, HEIC, PNG, or WebP." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "We couldn't read that photo. Try JPEG, HEIC, PNG, or WebP." },
          { status: 400 }
        );
      }
    }

    let out: Buffer;
    try {
      out = await sharp(buffer, { failOn: "error", animated: false })
        .rotate()
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88, alphaQuality: 92 })
        .toBuffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (sniffed === "heic" || /heif|heic/i.test(message)) {
        return NextResponse.json(
          { error: "We couldn't process this iPhone photo. Export it as JPEG and try again." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "We couldn't read that photo. Try JPEG, HEIC, PNG, or WebP." },
        { status: 400 }
      );
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const { url } = await storeUploadFile("celecard-avatars", session.user.id, safeName, out);
    return NextResponse.json({ success: true, data: { url } }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
