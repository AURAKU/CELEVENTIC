import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  listNfcDevicesForUser,
  mutateNfcDeviceForUser,
} from "@/services/digital-business-card/nfc-device.service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["pause", "resume", "lost", "replace"]),
  deviceId: z.string().min(8).max(80).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const data = await listNfcDevicesForUser(session.user.id, id, origin);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown NFC action" }, { status: 400 });
  }

  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-nfc:${session.user.id}:${ip}`, 20, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many NFC changes. Try again later." }, { status: 429 });
  }

  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const result = await mutateNfcDeviceForUser(session.user.id, id, parsed.data, origin);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, data: result });
}
