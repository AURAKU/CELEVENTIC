import { NextRequest, NextResponse } from "next/server";
import { digitalCardPublicUrl } from "@/lib/digital-business-card/types";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import {
  grantCookieOptions,
  resolveCeleCardGrant,
} from "@/services/digital-business-card/celecard-access.service";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token")?.trim() || "";
  const dest = digitalCardPublicUrl(slug);
  const card = await getDigitalCardBySlug(slug);
  if (!card || !isCeleCardPubliclyReachable(card, await getCeleCardLifecyclePolicy()) || !token) {
    return NextResponse.redirect(new URL(dest, req.url));
  }
  const grant = await resolveCeleCardGrant(card.id, token);
  const response = NextResponse.redirect(new URL(dest, req.url));
  if (grant) {
    response.cookies.set(celeCardGrantCookieName(card.id), token, grantCookieOptions(new Date(Date.now() + 12 * 60 * 60 * 1000)));
  }
  return response;
}
