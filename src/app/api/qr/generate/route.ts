import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { verifyEventAccess } from "@/lib/event-access";
import { QR_TYPES, type QrIntentType } from "@/lib/qr/qr-types";
import { buildVerifyUrl } from "@/lib/qr/parse-qr-payload";
import { QR_EXPORT_SIZES, type QrExportSize } from "@/lib/qr/qr-constants";

const generateSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().optional(),
  ticketId: z.string().optional(),
  type: z.string().optional(),
  regenerate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = generateSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);

    let token: string;
    let qrType: string;

    if (data.guestId) {
      const created = await qrService.createGuestAdmissionQr(data.eventId, data.guestId);
      token = created.token;
      qrType = QR_TYPES.GUEST_ADMISSION;
    } else if (data.ticketId) {
      const created = await qrService.createTicketQr(data.eventId, data.ticketId);
      token = created.token;
      qrType = QR_TYPES.TICKET;
    } else {
      const type = (data.type ?? QR_TYPES.PUBLIC_EVENT) as QrIntentType;
      const { generateToken } = await import("@/lib/utils");
      const { prisma } = await import("@/lib/prisma");
      token = generateToken(24);
      await prisma.qrCode.create({
        data: { eventId: data.eventId, token, type },
      });
      qrType = type;
    }

    const centerImage = await qrBrandingService.resolveCenterImageUrl(data.eventId);
    const verifyUrl = buildVerifyUrl(token);
    const exports = await Promise.all(
      QR_EXPORT_SIZES.map(async (size) => {
        const result = await qrBrandingService.generateForToken(token, size as QrExportSize, "png");
        return {
          size,
          pngUrl: `/api/qr/image?token=${encodeURIComponent(token)}&size=${size}`,
          dataUrl: result.dataUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        type: qrType,
        verifyUrl,
        centerImage,
        exports,
        svgUrl: `/api/qr/image?token=${encodeURIComponent(token)}&format=svg`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "QR generation failed" }, { status: 500 });
  }
}
