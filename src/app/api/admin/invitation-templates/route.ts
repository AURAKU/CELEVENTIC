import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const templates = await invitationAdminService.listCatalogTemplates(page, limit);
  return NextResponse.json({ success: true, data: templates });
}

const upsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string(),
  style: z.string(),
  layoutSlug: z.string(),
  previewGradient: z.string().optional(),
  previewImageUrl: z.string().optional(),
  previewVideoUrl: z.string().optional(),
  backgroundImageUrl: z.string().optional(),
  backgroundVideoUrl: z.string().optional(),
  motionReferenceUrl: z.string().optional(),
  inspirationMediaUrl: z.string().optional(),
  defaultGalleryUrls: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  packageSlugs: z.array(z.string()).optional(),
  priceGhs: z.number().optional(),
  languages: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = upsertSchema.parse(await req.json());
    const template = await invitationAdminService.upsertCatalogTemplate(body);
    return NextResponse.json({ success: true, data: template });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await invitationAdminService.deleteCatalogTemplate(id);
  return NextResponse.json({ success: true });
}
