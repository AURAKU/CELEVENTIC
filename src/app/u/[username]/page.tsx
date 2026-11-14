import { cookies, headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { DigitalCardPublicView } from "@/components/digital-business-card/digital-card-public-view";
import {
  DEMO_CARD_SLUG,
  getDemoCardBySlug,
  isDemoCardSlug,
} from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouPublicShare, toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import {
  buildCeleCardShareMetadata,
  celeCardPageOgPath,
  digitalCardOgImagePath,
  isCeleYouUnfurlRequest,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { recordCeleCardLifecycleEvent } from "@/services/digital-business-card/digital-business-card.service";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import {
  getDigitalCardBySlug,
  recordDigitalCardGuestOpen,
} from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleCardGrant } from "@/services/digital-business-card/celecard-access.service";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";
import { resolveCeleYouPublicHandle } from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

async function resolveHandle(raw: string) {
  if (isDemoCardSlug(raw) && raw !== DEMO_CARD_SLUG) {
    return { kind: "demo-alias" as const, slug: DEMO_CARD_SLUG };
  }
  if (getDemoCardBySlug(raw)) return { kind: "demo" as const, slug: raw };
  return resolveCeleYouPublicHandle(raw);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const resolved = await resolveHandle(username);
  if (resolved.kind === "demo" || resolved.kind === "demo-alias") {
    const demo = getDemoCardBySlug(resolved.slug);
    if (!demo || demo.presentationMode === "courtesy" || !demo.isLive) return withheldCeleCardMetadata();
    return buildCeleCardShareMetadata({
      card: demo,
      origin,
      imagePath: digitalCardOgImagePath(demo.slug, "live"),
    });
  }
  if (!("slug" in resolved) || !resolved.slug) return withheldCeleCardMetadata();
  const card = await getDigitalCardBySlug(resolved.slug);
  if (!card || card.deletedAt) return withheldCeleCardMetadata();
  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "profile", policy }).presentation;
  if (presentation === "live" || presentation === "courtesy") {
    return buildCeleCardShareMetadata({
      card,
      origin,
      imagePath: celeCardPageOgPath(card.slug, card.updatedAt),
    });
  }
  return withheldCeleCardMetadata();
}

export default async function CeleYouUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const resolved = await resolveHandle(username);
  if (resolved.kind === "demo-alias") redirect(`/u/${DEMO_CARD_SLUG}`);
  if (resolved.kind === "alias") permanentRedirect(`/u/${resolved.redirectTo}`);
  if (resolved.kind === "missing") notFound();

  const slug = "slug" in resolved ? resolved.slug : "";
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) {
      if (await isCeleYouUnfurlRequest()) return null;
      redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    }
    return <DigitalCardPublicView card={demo} origin={celeYouGuestOrigin(await getServerAppUrl())} />;
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) notFound();

  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "profile", policy }).presentation;
  if (presentation === "live") {
    if (!(await isCeleYouUnfurlRequest())) {
      const session = await getSession();
      const ua = (await headers()).get("user-agent") || "";
      void recordDigitalCardGuestOpen({
        cardId: card.id,
        ownerUserId: card.userId,
        viewerUserId: session?.user?.id,
        userAgent: ua,
      }).catch(() => undefined);
    }
  } else if (presentation === "courtesy") {
    void recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CourtesyPageViewed" }).catch(() => undefined);
  }

  const jar = await cookies();
  const grant = await resolveCeleCardGrant(card.id, jar.get(celeCardGrantCookieName(card.id))?.value);

  return (
    <DigitalCardPublicView
      card={toGuestPublicPayload(card, grant?.itemKeys ?? [], policy)}
      origin={celeYouGuestOrigin(await getServerAppUrl())}
    />
  );
}
