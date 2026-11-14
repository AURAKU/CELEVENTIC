import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { checkCeleYouUsernameAvailability } from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const session = await getServerSession(authOptions);
  const ipLimit = await rateLimit(`celecard-username-avail-ip:${ip}`, 30, 60);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "Too many username checks. Try again shortly." }, { status: 429 });
  }
  if (session?.user?.id) {
    const userLimit = await rateLimit(`celecard-username-avail-user:${session.user.id}`, 60, 60);
    if (!userLimit.success) {
      return NextResponse.json({ error: "Too many username checks. Try again shortly." }, { status: 429 });
    }
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username") || "";
  const data = await checkCeleYouUsernameAvailability({
    username,
    actorUserId: session?.user?.id ?? null,
    seed: {
      displayName: url.searchParams.get("displayName"),
      nickname: url.searchParams.get("nickname"),
      company: url.searchParams.get("company"),
      profession: url.searchParams.get("profession"),
      keywords: url.searchParams.getAll("keyword"),
    },
  });
  return NextResponse.json({
    username: data.username,
    available: data.available,
    reason: data.reason,
    suggestions: data.suggestions,
    message: data.message,
  });
}
