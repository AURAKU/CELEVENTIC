import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";
import { z } from "zod";

const schema = z.object({
  expiresAt: z.string().nullable().optional(),
  regenerate: z.boolean().optional(),
  purpose: z.enum(["UPLOAD", "VIEW"]).optional(),
});

function buildQrImageUrl(targetUrl: string, eventId: string) {
  return `/api/qr/image?data=${encodeURIComponent(targetUrl)}&eventId=${eventId}&size=512`;
}

async function resolveQrPair(eventId: string, baseUrl: string) {
  const [uploadToken, viewToken] = await Promise.all([
    eventMemoryTokenService.getOrCreateUploadToken(eventId),
    eventMemoryTokenService.getOrCreateViewToken(eventId),
  ]);

  const uploadUrl = `${baseUrl}/memory-upload/${uploadToken.token}`;
  const galleryUrl = `${baseUrl}/memory/${viewToken.token}`;

  return {
    upload: {
      token: uploadToken.token,
      url: uploadUrl,
      qrImageUrl: buildQrImageUrl(uploadUrl, eventId),
      expiresAt: uploadToken.expiresAt,
    },
    view: {
      token: viewToken.token,
      url: galleryUrl,
      qrImageUrl: buildQrImageUrl(galleryUrl, eventId),
      expiresAt: viewToken.expiresAt,
    },
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const body = schema.parse(await req.json().catch(() => ({})));
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const baseUrl = await getServerAppUrl();

    if (body.regenerate && body.purpose === "UPLOAD") {
      const tokenRecord = await eventMemoryTokenService.regenerateUploadToken(eventId, expiresAt);
      const uploadUrl = `${baseUrl}/memory-upload/${tokenRecord.token}`;
      return NextResponse.json({
        success: true,
        data: {
          purpose: "UPLOAD",
          token: tokenRecord.token,
          uploadUrl,
          qrImageUrl: buildQrImageUrl(uploadUrl, eventId),
          expiresAt: tokenRecord.expiresAt,
        },
      });
    }

    if (body.regenerate && body.purpose === "VIEW") {
      const viewToken = await eventMemoryTokenService.regenerateViewToken(eventId);
      const galleryUrl = `${baseUrl}/memory/${viewToken.token}`;
      return NextResponse.json({
        success: true,
        data: {
          purpose: "VIEW",
          token: viewToken.token,
          galleryUrl,
          qrImageUrl: buildQrImageUrl(galleryUrl, eventId),
        },
      });
    }

    const pair = await resolveQrPair(eventId, baseUrl);
    return NextResponse.json({ success: true, data: pair });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate QR" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const baseUrl = await getServerAppUrl();
    const pair = await resolveQrPair(eventId, baseUrl);

    return NextResponse.json({
      success: true,
      data: {
        ...pair,
        qrImageUrl: pair.upload.qrImageUrl,
        uploadUrl: pair.upload.url,
        galleryUrl: pair.view.url,
        viewQrImageUrl: pair.view.qrImageUrl,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}
