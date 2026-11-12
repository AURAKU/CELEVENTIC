import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { CELEYOU_FOLLOWUP_DELAYS } from "@/lib/celeyou-connect/followup-copy";
import { getCeleYouConnectFlags, isCeleYouConnectFlagOn } from "@/lib/celeyou-connect/flags";
import {
  getCeleYouConnectAutomation,
  previewCeleYouFollowup,
  sendCeleYouFollowupTest,
  upsertCeleYouConnectAutomation,
} from "@/services/celeyou-connect/delivery.service";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  subject: z.string().min(3).max(160).optional(),
  body: z.string().min(20).max(4000).optional(),
  delay: z.enum(CELEYOU_FOLLOWUP_DELAYS).optional(),
  customDelayMinutes: z.number().int().min(5).max(10080).nullable().optional(),
  requireFollowupConsent: z.boolean().optional(),
  previewGuestName: z.string().max(80).optional(),
  sendTest: z.boolean().optional(),
});

async function requireFlag() {
  const flags = await getCeleYouConnectFlags();
  return isCeleYouConnectFlagOn(flags, "connect_auto_followup");
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireFlag())) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { id } = await ctx.params;
  const data = await getCeleYouConnectAutomation(session.user.id, id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireFlag())) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid automation settings" }, { status: 400 });

  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-automations:${session.user.id}:${ip}`, 20, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many automation updates. Try again later." }, { status: 429 });
  }

  const saved = await upsertCeleYouConnectAutomation({
    userId: session.user.id,
    cardId: id,
    ...parsed.data,
  });
  if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id, userId: session.user.id },
    select: { displayName: true, slug: true },
  });
  const preview = card
    ? previewCeleYouFollowup({
        subject: saved.subject,
        body: saved.body,
        ownerName: card.displayName,
        guestName: parsed.data.previewGuestName || "Ama",
        slug: card.slug,
      })
    : null;

  if (parsed.data.sendTest) {
    const toEmail = session.user.email;
    if (!toEmail) return NextResponse.json({ error: "Add an email to your account first." }, { status: 400 });
    const test = await sendCeleYouFollowupTest({
      userId: session.user.id,
      cardId: id,
      toEmail,
      subject: saved.subject,
      body: saved.body,
    });
    if ("error" in test && test.error) {
      return NextResponse.json({ error: test.error, data: saved, preview: test.preview }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      data: saved,
      preview: test.preview,
      test: { ok: test.ok, accepted: test.ok === true },
    });
  }

  return NextResponse.json({ success: true, data: saved, preview });
}
