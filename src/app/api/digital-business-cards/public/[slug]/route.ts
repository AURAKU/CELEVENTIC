import { NextRequest, NextResponse } from "next/server";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getDemoCardBySlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundJson } from "@/lib/digital-business-card/demo-live-access";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import { resolveCeleCardGrant } from "@/services/digital-business-card/celecard-access.service";

export const dynamic = "force-dynamic";

/**
 * Anonymous public profile API. No Celeventic account required.
 * Unpublished, unpaid, or expired cards return a withheld payload with isLive false.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    const response = NextResponse.json({ success: true, data: demo });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const grant = await resolveCeleCardGrant(card.id, req.cookies.get(celeCardGrantCookieName(card.id))?.value);
  const response = NextResponse.json({ success: true, data: toGuestPublicPayload(card, grant?.itemKeys ?? []) });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
