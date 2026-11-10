import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import { digitalCardSocialsSchema } from "@/lib/digital-business-card/socials";
import {
  CeleCardAdminError,
  getCeleCardAdminDetail,
  updateAssistedCeleCard,
} from "@/services/digital-business-card/admin-command.service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(600).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  socials: digitalCardSocialsSchema.optional(),
  avatarUrl: z.string().max(800).nullable().optional(),
  themeId: z.string().max(80).nullable().optional(),
  connectBackEnabled: z.boolean().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const data = await getCeleCardAdminDetail(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireCeleCardPermission(Permission.CELECARD_EDIT);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const card = await updateAssistedCeleCard(
      { id: session.user.id, role: session.user.role },
      id,
      { ...parsed.data, email: parsed.data.email || null }
    );
    return NextResponse.json({ success: true, data: { id: card.id, slug: card.slug } });
  } catch (error) {
    if (error instanceof CeleCardAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
