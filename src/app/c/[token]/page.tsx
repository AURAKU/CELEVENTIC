import { redirect, notFound } from "next/navigation";
import {
  getDigitalCardByPublicToken,
  isDigitalCardLive,
} from "@/services/digital-business-card/digital-business-card.service";
import { DIGITAL_CARD_PUBLIC_PATH } from "@/lib/digital-business-card/types";

export const dynamic = "force-dynamic";

/**
 * Smart QR redirect identity: /c/{publicToken} → live /card/{slug}.
 * Profile can change without reprinting the QR.
 */
export default async function SmartCardShortRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const card = await getDigitalCardByPublicToken(token);
  if (!card) notFound();
  // Always land on the public card surface (handles offline/expired UI there).
  void isDigitalCardLive(card);
  redirect(`${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(card.slug)}`);
}
