import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { BRAND_LOGO_ALT, BRAND_LOGO_ASPECT, BRAND_LOGO_FULL } from "@/lib/brand/constants";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LogoProps {
  className?: string;
  /** @deprecated Full logo is always shown — use `size` instead */
  showTagline?: boolean;
  variant?: "default" | "light" | "ghost";
  /** @deprecated Use full logo badge at `xs` size instead */
  iconOnly?: boolean;
  size?: LogoSize;
  /** @deprecated Full official image is always used */
  useFullImage?: boolean;
  /** Rounded pill/badge behind logo (recommended) */
  badge?: boolean;
  /** Skip link wrapper (e.g. decorative placement) */
  decorative?: boolean;
}

const SIZE_CONFIG: Record<
  LogoSize,
  { maxHeight: number; padding: string; rounded: string; width: number }
> = {
  xs: { maxHeight: 40, padding: "p-1.5", rounded: "rounded-xl", width: 60 },
  sm: { maxHeight: 48, padding: "p-2", rounded: "rounded-2xl", width: 72 },
  md: { maxHeight: 64, padding: "p-2.5", rounded: "rounded-2xl", width: 96 },
  lg: { maxHeight: 88, padding: "p-3", rounded: "rounded-3xl", width: 132 },
  xl: { maxHeight: 120, padding: "p-4", rounded: "rounded-3xl", width: 180 },
};

function badgeStyles(variant: LogoProps["variant"]) {
  if (variant === "ghost") {
    return "bg-transparent border-transparent shadow-none";
  }
  if (variant === "light") {
    return "bg-white/95 border-white/25 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm";
  }
  return "bg-white border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.08)]";
}

export function Logo({
  className,
  variant = "default",
  iconOnly = false,
  size = "md",
  badge = true,
  decorative = false,
}: LogoProps) {
  const resolvedSize: LogoSize = iconOnly ? "xs" : size;
  const config = SIZE_CONFIG[resolvedSize];
  const imageHeight = config.maxHeight;
  const imageWidth = Math.round(imageHeight * BRAND_LOGO_ASPECT);

  const image = (
    <Image
      src={BRAND_LOGO_FULL}
      alt={BRAND_LOGO_ALT}
      width={imageWidth}
      height={imageHeight}
      quality={100}
      priority
      className="block object-contain object-center select-none"
      style={{
        width: imageWidth,
        height: imageHeight,
        maxWidth: "100%",
      }}
      sizes={`(max-width: 640px) ${config.width}px, ${imageWidth}px`}
    />
  );

  const content = badge ? (
    <span
      className={cn(
        "inline-flex items-center justify-center border transition-transform group-hover:scale-[1.02]",
        config.padding,
        config.rounded,
        badgeStyles(variant)
      )}
    >
      {image}
    </span>
  ) : (
    image
  );

  if (decorative) {
    return <span className={cn("inline-flex shrink-0", className)}>{content}</span>;
  }

  return (
    <Link
      href="/"
      className={cn("inline-flex group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl", className)}
      aria-label={APP_NAME}
    >
      {content}
    </Link>
  );
}
