import { redirect, notFound } from "next/navigation";
import {
  getDigitalCardByPublicToken,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";
import { DIGITAL_CARD_PUBLIC_PATH } from "@/lib/digital-business-card/types";
import { demoCardGuestPath, isDemoQrToken } from "@/lib/digital-business-card/demo-card";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

/**
 * Smart QR redirect: /c/{publicToken} → /card/{slug}.
 * Token stays stable when the slug or profile details change.
 * Unpublished cards still land on the public page, which withholds private fields.
 */
export default async function SmartCardShortRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (isDemoQrToken(token)) {
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    redirect(demoCardGuestPath());
  }
  const card = await getDigitalCardByPublicToken(token);
  if (!card || card.deletedAt) notFound();
  void recordSmartCardInteraction(card.id, "qr_open").catch(() => undefined);
  redirect(`${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(card.slug)}`);
}
