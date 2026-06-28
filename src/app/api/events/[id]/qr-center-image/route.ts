import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { isAdminRole } from "@/lib/roles";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { storeUploadFile } from "@/lib/uploads/file-storage";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    const event = await verifyEventAccess(eventId, session.user.id, session.user.role);
    if (event.organizerId !== session.user.id && !isAdminRole(session.user.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = qrBrandingService.validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const ext = EXT_MAP[file.type] ?? ".png";
    const safeName = `qr-center-${Date.now()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storeUploadFile("events", eventId, safeName, buffer);
    await prisma.event.update({
      where: { id: eventId },
      data: { qrCenterImageUrl: url },
    });

    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  await verifyEventAccess(eventId, session.user.id, session.user.role);

  await prisma.event.update({
    where: { id: eventId },
    data: { qrCenterImageUrl: null },
  });

  return NextResponse.json({ success: true });
}
