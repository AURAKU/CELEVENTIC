/** Original thin gold line-art for fashion guest notes — not Lucide, not emoji. */

import Image from "next/image";

/** House crest from fashion DNA `logoUrl`. Not a drawn F and not Femmora by default. */
export function FashionHouseLogoMark({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <span className={className} data-testid="fashion-wish-house-logo">
      <Image
        src={src}
        alt=""
        width={1536}
        height={1536}
        quality={100}
        sizes="56px"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        unoptimized
        aria-hidden
      />
    </span>
  );
}

export function FashionSalonMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      data-testid="fashion-wish-salon-mark"
    >
      <circle cx="16" cy="16" r="13.2" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="16" cy="16" r="10.6" stroke="currentColor" strokeWidth="0.5" opacity="0.55" />
      <path
        d="M16 7.8c-1.4 4.6-3.7 7.4-7 9.1 3.1.3 5.6-.2 8-1.8C16.4 19.8 14 23.9 11 28.2c4.3-2 8-2.2 11.8.2-1.7-4-2.1-8.1-1.1-12.8 3.3 2.1 4.9 4.6 5.9 8.5C26.7 16.8 24.4 11.8 19.4 8.1 21.4 7.2 19 7 16 7.8Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 12.8c.2 4-.3 8.2-1.9 13.6"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FashionQuillMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M7.4 24.8c2.4-1.1 4.2-1.4 6.6-.4"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 22.6c.6-3.4 3.2-8.8 8.8-13.8 2.8-2.5 6.1-3.9 8.4-4.4-.2 2.4-1.2 5.6-3.6 8.2-4.8 5.2-10.2 8.2-13.6 10"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 9.2c1.4 1.2 3.1 3.4 4.1 5.6"
        stroke="currentColor"
        strokeWidth="0.65"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M11.1 20.6l-2.4 3.6"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
