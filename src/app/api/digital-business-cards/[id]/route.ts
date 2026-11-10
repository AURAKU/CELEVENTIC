import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { digitalCardSocialsSchema } from "@/lib/digital-business-card/socials";
import { resolveCeleCardLifecycle } from "@/lib/digital-business-card/lifecycle";
import {
  getDigitalCardForUser,
  isDigitalCardLive,
  softDeleteDigitalCard,
  updateDigitalCard,
} from "@/services/digital-business-card/digital-business-card.service";
import type { DigitalCardSocials } from "@/lib/digital-business-card/types";

const socialsSchema = digitalCardSocialsSchema;

const updateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(600).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  socials: socialsSchema,
  themeId: z.string().optional(),
  avatarUrl: z.string().max(800).nullable().optional(),
  slug: z.string().min(2).max(48).optional(),
  isPublished: z.boolean().optional(),
  nfcEnabled: z.boolean().optional(),
});

const themeIds = new Set(DIGITAL_CARD_THEMES.map((t) => t.id));

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    success: true,
    data: { ...card, isLive: isDigitalCardLive(card), lifecycleState: resolveCeleCardLifecycle(card) },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.themeId && !themeIds.has(parsed.data.themeId as never)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }

  const { email, ...rest } = parsed.data;
  const emailNorm = email === "" ? null : email;

  const updated = await updateDigitalCard(session.user.id, id, {
    ...rest,
    email: emailNorm,
    socials: rest.socials as DigitalCardSocials,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    success: true,
    data: { ...updated, isLive: isDigitalCardLive(updated), lifecycleState: resolveCeleCardLifecycle(updated) },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await softDeleteDigitalCard(session.user.id, id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
