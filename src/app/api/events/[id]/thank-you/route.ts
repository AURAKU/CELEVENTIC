import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { thankYouService } from "@/services/thank-you/thank-you.service";

const updateSchema = z.object({
  templateId: z.string().optional(),
  title: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  eyebrow: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  closingMessage: z.string().nullable().optional(),
  signatureLine: z.string().nullable().optional(),
  hostNames: z.string().nullable().optional(),
  eventHashtag: z.string().nullable().optional(),
  footerText: z.string().nullable().optional(),
  flyerUrl: z.string().nullable().optional(),
  hostPhotoUrl: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  backgroundImageUrl: z.string().nullable().optional(),
  backgroundVideoUrl: z.string().nullable().optional(),
  signatureImageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  themeSource: z.enum(["INVITATION", "PRESET", "CUSTOM"]).optional(),
  designConfig: z.record(z.unknown()).nullable().optional(),
  sectionConfig: z.record(z.unknown()).nullable().optional(),
  guestbookConfig: z.record(z.unknown()).nullable().optional(),
  sharingConfig: z.record(z.unknown()).nullable().optional(),
  seoConfig: z.record(z.unknown()).nullable().optional(),
  featuredMemoryIds: z.array(z.string()).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const page = await thankYouService.getForOrganizer(eventId);
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
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
    const data = updateSchema.parse(await req.json());
    const page = await thankYouService.update(eventId, {
      ...data,
      updatedById: session.user.id,
    });
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(req, { params });
}
