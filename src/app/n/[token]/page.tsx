import { redirect, notFound } from "next/navigation";
import { resolveNfcDeviceTap } from "@/services/digital-business-card/digital-business-card.service";
import { DIGITAL_CARD_PUBLIC_PATH } from "@/lib/digital-business-card/types";

export const dynamic = "force-dynamic";

/**
 * NFC tap redirect: /n/{token} → paired SmartCard.
 * Tags store only this short URL — never private profile data.
 */
export default async function SmartCardNfcTapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const card = await resolveNfcDeviceTap(token);
  if (!card) notFound();
  redirect(`${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(card.slug)}`);
}
