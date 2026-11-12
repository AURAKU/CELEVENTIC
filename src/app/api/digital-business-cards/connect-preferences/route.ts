import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  newConnectionAlerts: z.boolean().optional(),
  exchangeAlerts: z.boolean().optional(),
  followupReminders: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  marketingNotifications: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.celeYouConnectPreference.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({
    success: true,
    data: row ?? {
      newConnectionAlerts: true,
      exchangeAlerts: true,
      followupReminders: true,
      weeklySummary: false,
      marketingNotifications: false,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-connect-prefs:${session.user.id}:${ip}`, 30, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many preference updates. Try again later." }, { status: 429 });
  }
  const current = await prisma.celeYouConnectPreference.findUnique({
    where: { userId: session.user.id },
  });
  const next = {
    newConnectionAlerts: parsed.data.newConnectionAlerts ?? current?.newConnectionAlerts ?? true,
    exchangeAlerts: parsed.data.exchangeAlerts ?? current?.exchangeAlerts ?? true,
    followupReminders: parsed.data.followupReminders ?? current?.followupReminders ?? true,
    weeklySummary: parsed.data.weeklySummary ?? current?.weeklySummary ?? false,
    marketingNotifications: parsed.data.marketingNotifications ?? false,
  };
  const saved = await prisma.celeYouConnectPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...next },
    update: next,
  });
  return NextResponse.json({ success: true, data: saved });
}
