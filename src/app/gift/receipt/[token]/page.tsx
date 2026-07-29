import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import { giftThemeToCssVars } from "@/lib/gifts/gift-theme";
import { GiftReceiptView } from "@/components/gifts/gift-receipt-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Gift receipt",
  robots: { index: false, follow: false },
};

/**
 * Signed receipt page, the guest's own proof of payment. Works without an
 * account, shows only their gift, and inherits the invitation's theme so the
 * receipt still feels like part of the celebration.
 */
export default async function GiftReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await giftReceiptService.resolveByToken(token);
  if (!receipt) notFound();

  return (
    <GiftReceiptView
      snapshot={receipt.snapshot}
      themeVars={giftThemeToCssVars(receipt.theme)}
      revoked={receipt.status === "REVOKED"}
    />
  );
}
