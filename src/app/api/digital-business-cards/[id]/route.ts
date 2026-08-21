import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import {
  getDigitalCardForUser,
  isDigitalCardLive,
  renewDigitalCardSubscription,
  updateDigitalCard,
} from "@/services/digital-business-card/digital-business-card.service";
import { prisma } from "@/lib/prisma";

const socialsSchema = z
  .object({
    linkedin: z.string().max(200).optional(),
    website: z.string().max(300).optional(),
    instagram: z.string().max(200).optional(),
    x: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
    whatsapp: z.string().max(40).optional(),
    youtube: z.string().max(200).optional(),
    tiktok: z.string().max(200).optional(),
    github: z.string().max(200).optional(),
  })
  .partial()
  .optional();

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
  avatarUrl: z.string().max(500).nullable().optional(),
  slug: z.string().min(2).max(48).optional(),
  isPublished: z.boolean().optional(),
  nfcEnabled: z.boolean().optional(),
  /** Soft renew — used after billing success; extends ACTIVE by 30 days */
  renewSubscription: z.boolean().optional(),
});

const themeIds = new Set(DIGITAL_CARD_THEMES.map((t) => t.id));

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...card, isLive: isDigitalCardLive(card) } });
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

  if (parsed.data.renewSubscription) {
    const renewed = await renewDigitalCardSubscription(session.user.id, id, "ACTIVE", 30);
    if (!renewed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...renewed, isLive: isDigitalCardLive(renewed) } });
  }

  const { renewSubscription: _r, email, ...rest } = parsed.data;
  const emailNorm = email === "" ? null : email;

  const updated = await updateDigitalCard(session.user.id, id, {
    ...rest,
    email: emailNorm,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...updated, isLive: isDigitalCardLive(updated) } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const existing = await getDigitalCardForUser(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.digitalBusinessCard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
