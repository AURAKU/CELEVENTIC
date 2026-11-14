import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { digitalCardSocialsSchema } from "@/lib/digital-business-card/socials";
import { celeCardOwnerShareFlags } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { CeleYouPaidTermLockedError } from "@/lib/digital-business-card/lifecycle";
import {
  CeleYouPublishLimitError,
  getDigitalCardForUser,
  nfcTokensByCardId,
  softDeleteDigitalCard,
  updateDigitalCard,
} from "@/services/digital-business-card/digital-business-card.service";
import { CELECARD_BIO_MAX_CHARS, type DigitalCardSocials } from "@/lib/digital-business-card/types";

const socialsSchema = digitalCardSocialsSchema;

const updateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(CELECARD_BIO_MAX_CHARS).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  socials: socialsSchema.optional(),
  themeId: z.string().optional(),
  avatarUrl: z.string().max(800).nullable().optional(),
  slug: z.string().min(2).max(48).optional(),
  isPublished: z.boolean().optional(),
  nfcEnabled: z.boolean().optional(),
  proximityDiscoverable: z.boolean().optional(),
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
    data: {
      ...card,
      ...celeCardOwnerShareFlags(card, await getCeleCardLifecyclePolicy()),
      nfcPublicToken: (await nfcTokensByCardId([card])).get(card.id) || null,
    },
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

  let updated;
  try {
    updated = await updateDigitalCard(session.user.id, id, {
      ...rest,
      email: emailNorm,
      socials: rest.socials as DigitalCardSocials | undefined,
    });
  } catch (error) {
    if (error instanceof CeleYouPublishLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      ...celeCardOwnerShareFlags(updated, await getCeleCardLifecyclePolicy()),
      nfcPublicToken: (await nfcTokensByCardId([updated])).get(updated.id) || null,
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const deleted = await softDeleteDigitalCard(session.user.id, id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CeleYouPaidTermLockedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
