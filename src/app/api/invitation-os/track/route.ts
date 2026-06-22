import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";

const schema = z.object({
  eventType: z.enum([
    "TEMPLATE_VIEW", "PACKAGE_SELECT", "CHECKOUT_START", "CHECKOUT_ABANDON",
    "PAYMENT_SUCCESS", "INVITE_OPEN", "RSVP_SUBMIT", "ADDON_SELECT",
  ]),
  orderId: z.string().optional(),
  invitationId: z.string().optional(),
  guestId: z.string().optional(),
  userId: z.string().optional(),
  templateSlug: z.string().optional(),
  packageSlug: z.string().optional(),
  addonSlug: z.string().optional(),
  revenueGhs: z.number().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimit(`track:${ip}`, 120, 60);
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  try {
    const body = schema.parse(await req.json());

    if (body.eventType === "INVITE_OPEN" && body.invitationId) {
      await invitationAnalyticsService.trackInviteOpen(body.invitationId, body.guestId);
    } else {
      await invitationAnalyticsService.track(body);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Track failed" }, { status: 400 });
  }
}
