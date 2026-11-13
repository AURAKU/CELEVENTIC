import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDigitalCardForUser } from "@/services/digital-business-card/digital-business-card.service";
import {
  createCeleCardAccessCode,
  listCeleCardAccessCodes,
} from "@/services/digital-business-card/celecard-access.service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  label: z.string().max(80).optional(),
  code: z.string().min(4).max(8),
  itemKeys: z.array(z.string().min(1).max(80)).min(1).max(40),
  expiresAt: z.string().datetime().optional().nullable(),
  maxRedemptions: z.number().int().positive().max(10000).optional().nullable(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const codes = await listCeleCardAccessCodes(card.id);
  return NextResponse.json({ success: true, data: codes });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the code and the details it unlocks" }, { status: 400 });
  }
  try {
    const created = await createCeleCardAccessCode({
      cardId: card.id,
      label: parsed.data.label || "Access code",
      code: parsed.data.code,
      itemKeys: parsed.data.itemKeys,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      maxRedemptions: parsed.data.maxRedemptions ?? null,
    });
    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        label: created.label,
        code: parsed.data.code.trim().toUpperCase(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
