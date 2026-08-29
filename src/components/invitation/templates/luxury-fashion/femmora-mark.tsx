import Image from "next/image";
import type { LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";

export function FashionHouseMark({
  house,
  className,
  priority = false,
}: {
  house: Pick<LuxuryFashionHouseConfig, "monogram" | "logoUrl" | "markVariant" | "houseName">;
  className?: string;
  /** Hub masthead crest is above the fold — never lazy-decode a 384w mush slot. */
  priority?: boolean;
}) {
  if (house.logoUrl?.trim()) {
    const src = house.logoUrl.trim();
    const alt = house.houseName.trim();
    return (
      <Image
        className={className}
        src={src}
        alt={alt}
        width={1536}
        height={1536}
        quality={100}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        unoptimized
        style={{ objectFit: "contain", maxWidth: "100%" }}
      />
    );
  }
  if (house.markVariant === "botanical") {
    return <FashionBotanicalMark className={className} />;
  }
  return (
    <span className={className} aria-hidden>
      {house.monogram || house.houseName.slice(0, 1)}
    </span>
  );
}

/** Original Celeventic botanical stem — reusable mark variant, not a client logo. */
export function FashionBotanicalMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width="96"
      height="96"
      fill="none"
      aria-hidden
    >
      <path
        d="M32 8c-2.8 9.4-7.4 15.2-14 18.8 6.2.6 11.4-.4 16.4-3.6C32.8 32.8 28 41.2 22 50c8.8-4.2 16.4-4.6 24.2.4-3.4-8.2-4.2-16.6-2.2-26.2C50.8 28.8 54 34 56 42c-1.8-14.4-6.6-24.6-16.6-32.2C42.2 6.8 37.4 6.2 32 8Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M31 18.5c.4 8.2-.6 16.8-3.8 28"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** @deprecated Use FashionHouseMark with markVariant botanical. */
export function FemmoraMark({ className }: { className?: string }) {
  return <FashionBotanicalMark className={className} />;
}
