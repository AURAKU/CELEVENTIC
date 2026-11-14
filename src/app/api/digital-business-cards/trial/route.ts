import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  activateCeleYouProTrial,
  getCeleYouTrialForUser,
} from "@/services/digital-business-card/trial.service";
import {
  CELEYOU_IDENTITY_STAYS_COPY,
  CELEYOU_TRIAL_NO_CARD_COPY,
} from "@/lib/digital-business-card/freemium";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const postSchema = z.object({
  cardId: z.string().min(1).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getCeleYouTrialForUser(session.user.id);
  return NextResponse.json({
    success: true,
    data: {
      ...data,
      trial: {
        ...data.trial,
        startedAt: data.trial.startedAt?.toISOString() ?? null,
        expiresAt: data.trial.expiresAt?.toISOString() ?? null,
        convertedAt: data.trial.convertedAt?.toISOString() ?? null,
      },
      identityCopy: CELEYOU_IDENTITY_STAYS_COPY,
      noCardCopy: CELEYOU_TRIAL_NO_CARD_COPY,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await rateLimit(`celeyou-trial:${session.user.id}:${clientIp(req)}`, 8, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many trial attempts. Try again shortly." }, { status: 429 });
  }
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trial request." }, { status: 400 });
  }
  const result = await activateCeleYouProTrial({
    userId: session.user.id,
    cardId: parsed.data.cardId,
    actorId: session.user.id,
  });
  if (!result.ok) {
    const status = result.reason === "unpublished" ? 409 : 409;
    return NextResponse.json({ error: result.error, reason: result.reason }, { status });
  }
  return NextResponse.json({
    success: true,
    data: {
      trial: {
        ...result.trial,
        startedAt: result.trial.startedAt?.toISOString() ?? null,
        expiresAt: result.trial.expiresAt?.toISOString() ?? null,
        convertedAt: result.trial.convertedAt?.toISOString() ?? null,
      },
      cardId: result.cardId,
      expiresAt: result.expiresAt.toISOString(),
      noCardCopy: CELEYOU_TRIAL_NO_CARD_COPY,
    },
  });
}
