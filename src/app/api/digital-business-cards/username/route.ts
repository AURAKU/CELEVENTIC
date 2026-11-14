import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  CeleYouUsernameError,
  claimCeleYouUsername,
  getCeleYouAccountIdentity,
  setCeleYouPrimaryCard,
} from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getCeleYouAccountIdentity(session.user.id);
  return NextResponse.json({ success: true, data });
}

const patchSchema = z.object({
  username: z.string().min(1).max(40).optional(),
  confirm: z.boolean().optional(),
  primaryCardId: z.string().min(1).optional(),
  displayName: z.string().max(80).optional(),
  nickname: z.string().max(80).optional(),
  company: z.string().max(120).optional(),
  profession: z.string().max(80).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = clientIp(req);
  const limited = await rateLimit(`celecard-username-claim:${session.user.id}:${ip}`, 8, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many username changes. Try again later." }, { status: 429 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    if (parsed.data.primaryCardId && !parsed.data.username) {
      const primary = await setCeleYouPrimaryCard(session.user.id, parsed.data.primaryCardId);
      const data = await getCeleYouAccountIdentity(session.user.id);
      return NextResponse.json({ success: true, data, primary });
    }
    if (!parsed.data.username) return NextResponse.json({ error: "Username is required." }, { status: 400 });
    const identity = await getCeleYouAccountIdentity(session.user.id);
    if (identity?.username && parsed.data.confirm !== true && parsed.data.username !== identity.username) {
      return NextResponse.json(
        {
          error: "Confirm this change. Your public profile address will move. QR and NFC links stay the same.",
          needsConfirm: true,
        },
        { status: 409 }
      );
    }
    await claimCeleYouUsername({
      userId: session.user.id,
      username: parsed.data.username,
      actorId: session.user.id,
      ipAddress: ip,
      primaryCardId: parsed.data.primaryCardId ?? identity?.primaryCardId,
      seed: {
        displayName: parsed.data.displayName ?? identity?.displayName,
        nickname: parsed.data.nickname,
        company: parsed.data.company,
        profession: parsed.data.profession,
      },
    });
    const data = await getCeleYouAccountIdentity(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CeleYouUsernameError) {
      return NextResponse.json({ error: error.message, reason: error.code }, { status: error.status });
    }
    console.error("[celecard.username]", error);
    return NextResponse.json({ error: "Could not save that username." }, { status: 500 });
  }
}
