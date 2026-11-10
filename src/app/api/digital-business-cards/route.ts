import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { digitalCardSocialsSchema } from "@/lib/digital-business-card/socials";
import { celeCardOwnerShareFlags } from "@/lib/digital-business-card/access";
import { ownerMayRenewSubscription } from "@/lib/digital-business-card/billing-rules";
import { pickAccountPaidEntitlement } from "@/lib/digital-business-card/lifecycle";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  createDigitalCard,
  listDigitalCardsForUser,
  nfcTokensByCardId,
} from "@/services/digital-business-card/digital-business-card.service";
import type { DigitalCardSocials } from "@/lib/digital-business-card/types";

const socialsSchema = digitalCardSocialsSchema;

const createSchema = z.object({
  displayName: z.string().min(2).max(80),
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cards = await listDigitalCardsForUser(session.user.id);
    const [nfcTokens, policy] = await Promise.all([nfcTokensByCardId(cards), getCeleCardLifecyclePolicy()]);
    const now = new Date();
    const canRenew = ownerMayRenewSubscription(pickAccountPaidEntitlement(cards, now, policy), now);
    return NextResponse.json({
      success: true,
      data: cards.map((c) => ({
        ...c,
        ...celeCardOwnerShareFlags(c, policy),
        nfcPublicToken: nfcTokens.get(c.id) || null,
        canRenew,
      })),
    });
  } catch (error) {
    console.error("[celecard.list]", error);
    return NextResponse.json({ error: "Could not load CeleYou cards" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.themeId && !themeIds.has(parsed.data.themeId as never)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }

  const email =
    parsed.data.email === "" || parsed.data.email === undefined ? null : parsed.data.email;

  const card = await createDigitalCard(session.user.id, {
    ...parsed.data,
    email,
    socials: parsed.data.socials as DigitalCardSocials,
  });

  const [nfcTokens, policy] = await Promise.all([nfcTokensByCardId([card]), getCeleCardLifecyclePolicy()]);
  return NextResponse.json(
    {
      success: true,
      data: { ...card, ...celeCardOwnerShareFlags(card, policy), nfcPublicToken: nfcTokens.get(card.id) || null },
    },
    { status: 201 }
  );
}
