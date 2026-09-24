import type { GiftPaymentMethodId } from "@/lib/gifts/gift-providers";

/**
 * Official Ghana telco app-icon marks shown beside gift method names.
 * MTN yellow wordmark, Telecel T, and AT red lockup.
 */
export function GiftNetworkLogo({
  methodId,
  className,
}: {
  methodId: string;
  className?: string;
}) {
  if (methodId === "MTN_MOMO") {
    return (
      <svg className={className} viewBox="0 0 48 48" role="img" aria-label="MTN">
        <rect width="48" height="48" rx="10" fill="#FFCC00" />
        {/* M */}
        <path
          fill="#111"
          d="M4.8 35.2V13.4h3.55l3.7 10.35h.22l3.7-10.35H19.5v21.8h-3.05V21.15h-.16L13.1 32.4h-1.85L7.99 21.15H7.84v14.05H4.8z"
        />
        {/* T */}
        <path fill="#111" d="M21.3 13.4h13.05v3.35h-4.85v18.45h-3.35V16.75H21.3z" />
        {/* N */}
        <path
          fill="#111"
          d="M35.1 35.2V13.4h3.45L44.6 28.6h.2V13.4H47.9v21.8h-3.45L38.7 20h-.2v15.2H35.1z"
        />
      </svg>
    );
  }
  if (methodId === "TELECEL_CASH") {
    return (
      <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Telecel">
        <rect width="48" height="48" rx="10" fill="#E30613" />
        <path fill="#fff" d="M10 12.6h28v7.2H30.2V35.6H17.8V19.8H10z" />
      </svg>
    );
  }
  if (methodId === "AIRTELTIGO_MONEY") {
    return (
      <svg className={className} viewBox="0 0 48 48" role="img" aria-label="AT">
        <rect width="48" height="48" rx="10" fill="#ED1C24" />
        {/* A */}
        <path
          fill="#fff"
          d="M6.4 35.2 14.85 12.8h3.9L27.2 35.2h-3.9l-1.55-4.3H11.85L10.3 35.2H6.4zm6.7-7.35h8.15L18.05 18.3h-.15L13.1 27.85z"
        />
        {/* T */}
        <path fill="#fff" d="M29.6 12.8h16.1v3.7h-6.2v18.7h-3.7V16.5H29.6z" />
      </svg>
    );
  }
  return null;
}

export function isTelcoGiftMethod(id: string): id is GiftPaymentMethodId {
  return id === "MTN_MOMO" || id === "TELECEL_CASH" || id === "AIRTELTIGO_MONEY";
}
