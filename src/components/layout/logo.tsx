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
  /** Soft glass plate behind logo (recommended) */
  badge?: boolean;
  /** Skip link wrapper (e.g. decorative placement) */
  decorative?: boolean;
}

const SIZE_CONFIG: Record<
  LogoSize,
  { maxHeight: number; padding: string; width: number }
> = {
  xs: { maxHeight: 44, padding: "px-2 py-1", width: 66 },
  sm: { maxHeight: 56, padding: "px-2.5 py-1.5", width: 84 },
  md: { maxHeight: 72, padding: "px-3 py-2", width: 108 },
  lg: { maxHeight: 96, padding: "px-3.5 py-2.5", width: 144 },
  xl: { maxHeight: 128, padding: "px-4 py-3", width: 192 },
};

/** Outer shell: futuristic soft blade / capsule with brand-edge glow */
function shellStyles(variant: LogoProps["variant"]) {
  if (variant === "ghost") {
    return "bg-transparent p-0 shadow-none";
  }
  if (variant === "light") {
    return cn(
      "p-[1px]",
      "bg-gradient-to-br from-white/55 via-white/20 to-orange-300/25",
      "shadow-[0_8px_28px_rgba(0,0,0,0.18)]"
    );
  }
  // Header / light surfaces: blends into frosted sticky bar
  return cn(
    "p-[1px]",
    "bg-gradient-to-br from-teal-400/35 via-white/40 to-orange-400/30",
    "shadow-[0_0_0_1px_rgba(15,118,110,0.06),0_4px_18px_rgba(15,118,110,0.06)]"
  );
}

/** Inner plate: glass that reads against header blur without boxing the mark */
function plateStyles(variant: LogoProps["variant"]) {
  if (variant === "ghost") {
    return "bg-transparent";
  }
  if (variant === "light") {
    return cn(
      "bg-white/90 backdrop-blur-md",
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
    );
  }
  return cn(
    "bg-white/45 backdrop-blur-md",
    "supports-[backdrop-filter]:bg-white/30",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(15,118,110,0.04)]"
  );
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
      className="block object-contain object-center select-none drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]"
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
        "inline-flex items-center justify-center rounded-[1.35rem]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "group-hover:scale-[1.02] group-hover:shadow-[0_0_0_1px_rgba(20,184,166,0.18),0_6px_22px_rgba(15,118,110,0.1)]",
        shellStyles(variant)
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-[1.28rem]",
          config.padding,
          plateStyles(variant)
        )}
      >
        {image}
      </span>
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
      className={cn(
        "inline-flex group shrink-0 focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "rounded-[1.35rem]",
        className
      )}
      aria-label={APP_NAME}
    >
      {content}
    </Link>
  );
}
