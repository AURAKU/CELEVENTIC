import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const url = await qrBrandingService.getAdminDefaultLogoUrl();
  return NextResponse.json({ success: true, data: { url } });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    // Single source of truth — this used to duplicate the size/type rules and
    // drifted out of sync with the service.
    const validationError = qrBrandingService.validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const name = `qr-default-logo${ext}`;
    const { url } = await storeUploadFile("branding", "", name, Buffer.from(await file.arrayBuffer()));
    await qrBrandingService.setAdminDefaultLogoUrl(url);
    return NextResponse.json({ success: true, data: { url } });
  }

  const body = (await req.json()) as { url?: string };
  if (!body.url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  await qrBrandingService.setAdminDefaultLogoUrl(body.url);
  return NextResponse.json({ success: true, data: { url: body.url } });
}
