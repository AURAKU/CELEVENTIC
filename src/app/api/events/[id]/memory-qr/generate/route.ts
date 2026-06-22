import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { z } from "zod";

const schema = z.object({
  expiresAt: z.string().nullable().optional(),
  regenerate: z.boolean().optional(),
});

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

    const tokenRecord = body.regenerate
      ? await eventMemoryTokenService.regenerateUploadToken(eventId, expiresAt)
      : await eventMemoryTokenService.getOrCreateUploadToken(eventId, expiresAt);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://celeventic.com";
    const uploadUrl = `${baseUrl}/memory-upload/${tokenRecord.token}`;
    const qrImageUrl = `/api/qr/image?data=${encodeURIComponent(uploadUrl)}&eventId=${eventId}&size=512`;

    return NextResponse.json({
      success: true,
      data: {
        token: tokenRecord.token,
        uploadUrl,
        qrImageUrl,
        expiresAt: tokenRecord.expiresAt,
      },
    });
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
    const tokens = await eventMemoryTokenService.listTokens(eventId, "UPLOAD");
    const active = tokens.find((t) => !t.isRevoked);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://celeventic.com";
    return NextResponse.json({
      success: true,
      data: active
        ? {
            token: active.token,
            uploadUrl: `${baseUrl}/memory-upload/${active.token}`,
            qrImageUrl: `/api/qr/image?data=${encodeURIComponent(`${baseUrl}/memory-upload/${active.token}`)}&eventId=${eventId}&size=512`,
            expiresAt: active.expiresAt,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}
