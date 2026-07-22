import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { createAuditLog } from "@/lib/audit";
import {
  adminUniquenessForSlug,
  upsertAdminCreativeOverride,
  getAdminCreativeOverride,
} from "@/lib/invitation/admin-creative-overrides";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const uniquenessSlug = searchParams.get("uniqueness");
  if (uniquenessSlug) {
    const report = adminUniquenessForSlug(uniquenessSlug);
    const override = getAdminCreativeOverride(uniquenessSlug);
    return NextResponse.json({ success: true, data: { report, override: override ?? null } });
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

const actionSchema = z.object({
  action: z.enum(["duplicate", "archive", "restore", "hard-delete", "creative-override"]),
  id: z.string().optional(),
  slug: z.string().optional(),
  override: z
    .object({
      catalogSlug: z.string(),
      revealMechanic: z.string().optional(),
      openingExperience: z.string().optional(),
      motionProfile: z.string().optional(),
      parallaxProfile: z.string().optional(),
      typographySystem: z.string().optional(),
      buttonFamily: z.string().optional(),
      mediaPresentationStyle: z.string().optional(),
      defaultAudioTrack: z.string().optional(),
      compatibleAudioCategories: z.array(z.string()).optional(),
      outroType: z.string().optional(),
      sceneTransition: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const raw = await req.json();
    if (raw?.action) {
      const body = actionSchema.parse(raw);
      const adminId = session.user.id;
      if (body.action === "duplicate" && body.id) {
        const template = await invitationAdminService.duplicateCatalogTemplate(body.id, adminId);
        return NextResponse.json({ success: true, data: template });
      }
      if (body.action === "archive" && body.id) {
        const template = await invitationAdminService.archiveCatalogTemplate(body.id, adminId);
        return NextResponse.json({ success: true, data: template });
      }
      if (body.action === "restore" && body.id) {
        const template = await invitationAdminService.restoreCatalogTemplate(body.id, adminId);
        return NextResponse.json({ success: true, data: template });
      }
      if (body.action === "hard-delete" && body.id) {
        const result = await invitationAdminService.hardDeleteCatalogTemplate(body.id, adminId);
        return NextResponse.json({ success: true, data: result });
      }
      if (body.action === "creative-override" && body.override) {
        const saved = upsertAdminCreativeOverride(body.override as never);
        await createAuditLog({
          userId: adminId,
          action: "UPDATE",
          entity: "invitation_creative_override",
          entityId: saved.catalogSlug,
          details: saved as unknown as Record<string, unknown>,
        });
        return NextResponse.json({
          success: true,
          data: { override: saved, report: adminUniquenessForSlug(saved.catalogSlug) },
        });
      }
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const body = upsertSchema.parse(raw);
    const template = await invitationAdminService.upsertCatalogTemplate(body);
    await createAuditLog({
      userId: session.user.id,
      action: body.id ? "UPDATE" : "CREATE",
      entity: "invitation_catalog_template",
      entityId: template.id,
      details: { slug: template.slug, name: template.name },
    });
    return NextResponse.json({ success: true, data: template });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
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
  const hard = searchParams.get("hard") === "true";
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  try {
    if (hard) {
      const result = await invitationAdminService.hardDeleteCatalogTemplate(id, session.user.id);
      return NextResponse.json({ success: true, data: result });
    }
    await invitationAdminService.archiveCatalogTemplate(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
