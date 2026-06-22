import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const caption = (form.get("caption") as string) ?? undefined;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const validation = vendorMediaService.validateFile(file.type, file.size);
    if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "vendors", vendor.id);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safeName), buffer);

    const url = `/uploads/vendors/${vendor.id}/${safeName}`;
    const media = await vendorMediaService.addMedia(vendor.id, {
      url,
      type: validation.mediaType!,
      caption,
      sizeBytes: file.size,
    });

    return NextResponse.json({ success: true, data: media });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
