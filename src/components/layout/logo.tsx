import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME, BRAND_TAGLINE } from "@/lib/constants";
import { BrandMotto } from "@/components/brand/brand-motto";

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: "default" | "light";
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  useFullImage?: boolean;
}

const markSizes = { sm: 36, md: 44, lg: 56 } as const;
const fullWidths = { sm: 120, md: 160, lg: 200 } as const;

function BrandTagline({ isLight }: { isLight: boolean }) {
  return (
    <div className="mt-1 hidden sm:block">
      <BrandMotto size="sm" variant={isLight ? "light" : "default"} />
      <p
        className={cn(
          "text-[9px] uppercase tracking-[0.14em] mt-0.5 font-medium",
          isLight ? "text-slate-500" : "text-slate-500"
        )}
      >
        {BRAND_TAGLINE}
      </p>
    </div>
  );
}

export function Logo({
  className,
  showTagline = false,
  variant = "default",
  iconOnly = false,
  size = "md",
  useFullImage = false,
}: LogoProps) {
  const isLight = variant === "light";
  const markSize = markSizes[size];
  const fullWidth = fullWidths[size];

  if (useFullImage && !iconOnly) {
    return (
      <Link href="/" className={cn("inline-flex group shrink-0", className)}>
        <Image
          src="/brand/logo-full.png"
          alt={`${APP_NAME} logo`}
          width={fullWidth}
          height={fullWidth}
          className="h-auto w-auto max-w-full drop-shadow-sm transition-transform group-hover:scale-[1.01]"
          style={{ width: fullWidth, height: "auto" }}
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2.5 sm:gap-3 group shrink-0", className)}>
      <Image
        src="/brand/logo-mark.png"
        alt={`${APP_NAME} logo`}
        width={markSize}
        height={markSize}
        className="shrink-0 drop-shadow-sm transition-transform group-hover:scale-[1.02]"
        priority
      />

      {!iconOnly && (
        <div className="min-w-0">
          <span
            className={cn(
              "font-display font-bold tracking-tight leading-none block truncate",
              size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg sm:text-xl",
              isLight ? "text-white" : "text-slate-900"
            )}
          >
            {APP_NAME}
          </span>
          {showTagline && <BrandTagline isLight={isLight} />}
        </div>
      )}
    </Link>
  );
}
