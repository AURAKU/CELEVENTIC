import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";
import {
  createDigitalCard,
  listDigitalCardsForUser,
} from "@/services/digital-business-card/digital-business-card.service";

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
  avatarUrl: z.string().max(500).nullable().optional(),
  slug: z.string().min(2).max(48).optional(),
  isPublished: z.boolean().optional(),
  nfcEnabled: z.boolean().optional(),
});

const themeIds = new Set(DIGITAL_CARD_THEMES.map((t) => t.id));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await listDigitalCardsForUser(session.user.id);
  return NextResponse.json({
    success: true,
    data: cards.map((c) => ({
      ...c,
      isLive: isDigitalCardLive(c),
    })),
  });
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
  });

  return NextResponse.json({ success: true, data: { ...card, isLive: isDigitalCardLive(card) } }, { status: 201 });
}
