import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { DigitalCardPublicView } from "@/components/digital-business-card/digital-card-public-view";
import {
  DEMO_CARD_SLUG,
  getDemoCardBySlug,
  isDemoCardSlug,
} from "@/lib/digital-business-card/demo-card";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  courtesyCeleCardMetadata,
  digitalCardOgImagePath,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { celeCardPublicPresentation } from "@/lib/digital-business-card/lifecycle";
import { recordCeleCardLifecycleEvent } from "@/services/digital-business-card/digital-business-card.service";
import { getServerAppUrl } from "@/lib/app-url";
import {
  getDigitalCardBySlug,
  incrementDigitalCardView,
} from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleCardGrant } from "@/services/digital-business-card/celecard-access.service";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const origin = await getServerAppUrl();
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) return withheldCeleCardMetadata();
    if (demo.presentationMode === "courtesy" || !demo.isLive) {
      return courtesyCeleCardMetadata(demo.displayName);
    }
    return buildCeleCardShareMetadata({
      card: demo,
      origin,
      imagePath: digitalCardOgImagePath(demo.slug, "card-tile"),
    });
  }
  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return withheldCeleCardMetadata();
  const presentation = celeCardPublicPresentation(card);
  if (presentation === "live") {
    return buildCeleCardShareMetadata({
      card,
      origin,
      imagePath: digitalCardOgImagePath(card.slug, celeCardShareCacheVersion(card.updatedAt)),
    });
  }
  if (presentation === "courtesy") {
    return courtesyCeleCardMetadata(card.displayName);
  }
  return withheldCeleCardMetadata();
}

export default async function DigitalBusinessCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoCardSlug(slug) && slug !== DEMO_CARD_SLUG) {
    redirect(`/card/${DEMO_CARD_SLUG}`);
  }

  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    return <DigitalCardPublicView card={demo} origin={await getServerAppUrl()} />;
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) notFound();

  const presentation = celeCardPublicPresentation(card);
  if (presentation === "live") {
    void incrementDigitalCardView(card.id).catch(() => undefined);
  } else if (presentation === "courtesy") {
    void recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CourtesyPageViewed" }).catch(() => undefined);
  }

  const jar = await cookies();
  const grant = await resolveCeleCardGrant(card.id, jar.get(celeCardGrantCookieName(card.id))?.value);

  return (
    <DigitalCardPublicView
      card={toGuestPublicPayload(card, grant?.itemKeys ?? [])}
      origin={await getServerAppUrl()}
    />
  );
}
