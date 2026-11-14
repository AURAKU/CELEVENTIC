import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  isCeleYouActivationEventKind,
  isCeleYouActivationStepId,
} from "@/lib/digital-business-card/activation";
import { CELECARD_BIO_MAX_CHARS } from "@/lib/digital-business-card/types";
import {
  ensureFirstOnboardingCard,
  getOnboardingActivationState,
  publishOnboardingCard,
  recordOnboardingActivationEvent,
} from "@/services/digital-business-card/activation.service";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const draftSchema = z.object({
  displayName: z.string().max(80).optional(),
  title: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(CELECARD_BIO_MAX_CHARS).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  whatsapp: z.string().max(40).nullable().optional(),
  themeId: z.string().max(80).optional(),
  avatarUrl: z.string().max(800).nullable().optional(),
});

const postSchema = z.object({
  action: z.enum(["save", "publish", "event"]).default("save"),
  cardId: z.string().min(1).optional(),
  kind: z.string().optional(),
  step: z.string().optional(),
  draft: draftSchema.optional(),
});

function draftInput(draft?: z.infer<typeof draftSchema>) {
  if (!draft) return {};
  return {
    ...draft,
    email: draft.email === "" ? null : draft.email,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getOnboardingActivationState(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[celecard.activation.get]", error);
    return NextResponse.json({ error: "Could not load onboarding" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    if (parsed.data.action === "event") {
      const limited = await rateLimit(`celecard-activation-event:${session.user.id}:${ip}`, 40, 3600);
      if (!limited.success) {
        return NextResponse.json({ error: "Too many events" }, { status: 429 });
      }
      if (!isCeleYouActivationEventKind(parsed.data.kind)) {
        return NextResponse.json({ error: "Unknown event" }, { status: 400 });
      }
      const step = isCeleYouActivationStepId(parsed.data.step) ? parsed.data.step : undefined;
      const recorded = await recordOnboardingActivationEvent({
        userId: session.user.id,
        cardId: parsed.data.cardId,
        kind: parsed.data.kind,
        step,
      });
      return NextResponse.json({ success: true, recorded });
    }

    const limited = await rateLimit(`celecard-activation-write:${session.user.id}:${ip}`, 30, 3600);
    if (!limited.success) {
      return NextResponse.json({ error: "Too many saves. Try again in a moment." }, { status: 429 });
    }

    if (parsed.data.action === "publish") {
      await publishOnboardingCard(session.user.id, draftInput(parsed.data.draft));
    } else {
      await ensureFirstOnboardingCard(session.user.id, draftInput(parsed.data.draft));
    }
    const data = await getOnboardingActivationState(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const { CeleYouPublishLimitError } = await import(
      "@/services/digital-business-card/digital-business-card.service"
    );
    if (error instanceof CeleYouPublishLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Could not save onboarding";
    console.error("[celecard.activation.post]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
