import type { GiftPaymentMethodId } from "@/lib/gifts/gift-providers";

/**
 * Official Ghana telco marks for gift method pickers.
 * MTN 2022 wordmark (mtn.co.za), Telecel t-badge (telecel.com.gh),
 * AT Money lockup (at.com.gh).
 */
const NETWORK_MARKS: Record<
  string,
  { src: string; alt: string }
> = {
  MTN_MOMO: { src: "/gifts/networks/mtn-momo.svg", alt: "MTN" },
  TELECEL_CASH: { src: "/gifts/networks/telecel-cash.svg", alt: "Telecel" },
  AIRTELTIGO_MONEY: { src: "/gifts/networks/at-money.png", alt: "AT Money" },
};

export function GiftNetworkLogo({
  methodId,
  className,
}: {
  methodId: string;
  className?: string;
}) {
  const mark = NETWORK_MARKS[methodId];
  if (!mark) return null;
  return (
    <img
      src={mark.src}
      alt={mark.alt}
      className={className}
      draggable={false}
      style={{ objectFit: "contain" }}
    />
  );
}

export function isTelcoGiftMethod(id: string): id is GiftPaymentMethodId {
  return id === "MTN_MOMO" || id === "TELECEL_CASH" || id === "AIRTELTIGO_MONEY";
}
