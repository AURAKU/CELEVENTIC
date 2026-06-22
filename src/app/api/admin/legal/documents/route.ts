import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getSession, isAdminRole } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = new URL(req.url).searchParams.get("slug") ?? undefined;
  const [documents, stats] = await Promise.all([
    complianceService.listDocumentVersions(slug ?? undefined),
    complianceService.getAcceptanceStats(),
  ]);

  return NextResponse.json({ success: true, data: { documents, stats } });
}

const publishSchema = z.object({
  slug: z.string().min(2),
  version: z.string().min(1),
  contentEn: z.string().min(10),
  contentFr: z.string().min(10),
  titleEn: z.string().optional(),
  titleFr: z.string().optional(),
  requiresReacceptance: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = publishSchema.parse(await req.json());
    const doc = await complianceService.publishDocumentVersion({
      ...body,
      createdBy: session.user.id,
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "legal_document",
      entityId: `${body.slug}:${body.version}`,
      details: { requiresReacceptance: body.requiresReacceptance },
    });

    revalidateTag("cms-pages");

    return NextResponse.json({ success: true, data: doc });
  } catch {
    return NextResponse.json({ error: "Publish failed" }, { status: 400 });
  }
}
