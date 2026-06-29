import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";
import { storeUploadFile } from "@/lib/uploads/file-storage";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const validation = vendorMediaService.validateFile(file.type, file.size);
    if (!validation.valid || validation.mediaType !== "image") {
      return NextResponse.json({ error: validation.reason ?? "Images only" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const safeName = `profile-${Date.now()}.${safeExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storeUploadFile("vendors", vendor.id, safeName, buffer);

    await vendorProfileService.updateProfileImage(vendor.id, session.user.id, url);

    return NextResponse.json({ success: true, data: { url } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  try {
    await vendorProfileService.updateProfileImage(vendor.id, session.user.id, null);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Remove failed" }, { status: 400 });
  }
}
