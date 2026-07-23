import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { parseQrLogoSize } from "@/lib/qr/qr-constants";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const [url, logoSize] = await Promise.all([
    qrBrandingService.getAdminDefaultLogoUrl(),
    qrBrandingService.getAdminDefaultLogoSize(),
  ]);
  return NextResponse.json({ success: true, data: { url, logoSize } });
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
    const logoSizeRaw = formData.get("logoSize");
    if (typeof logoSizeRaw === "string" && logoSizeRaw.length > 0) {
      await qrBrandingService.setAdminDefaultLogoSize(parseQrLogoSize(logoSizeRaw));
    }
    if (!file) {
      const [url, logoSize] = await Promise.all([
        qrBrandingService.getAdminDefaultLogoUrl(),
        qrBrandingService.getAdminDefaultLogoSize(),
      ]);
      return NextResponse.json({ success: true, data: { url, logoSize } });
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
    const logoSize = await qrBrandingService.getAdminDefaultLogoSize();
    return NextResponse.json({ success: true, data: { url, logoSize } });
  }

  const body = (await req.json()) as { url?: string; logoSize?: string };
  if (body.logoSize != null) {
    await qrBrandingService.setAdminDefaultLogoSize(parseQrLogoSize(body.logoSize));
  }
  if (body.url) {
    await qrBrandingService.setAdminDefaultLogoUrl(body.url);
  }
  if (!body.url && body.logoSize == null) {
    return NextResponse.json({ error: "url or logoSize required" }, { status: 400 });
  }

  const [url, logoSize] = await Promise.all([
    qrBrandingService.getAdminDefaultLogoUrl(),
    qrBrandingService.getAdminDefaultLogoSize(),
  ]);
  return NextResponse.json({ success: true, data: { url, logoSize } });
}
