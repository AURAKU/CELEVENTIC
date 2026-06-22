import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface LogoProps {
  className?: string;
  /** Show tagline under text logo (ignored when using full official image) */
  showTagline?: boolean;
  variant?: "default" | "light";
  /** Icon-only mark for compact mobile header / sidebar */
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  /** Use stacked official logo (icon + Celeventic wordmark) */
  useFullImage?: boolean;
}

const markSizes = { sm: 40, md: 48, lg: 56 } as const;
const fullWidths = { sm: 140, md: 180, lg: 220 } as const;

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
      <Link href="/" className={cn("inline-flex group shrink-0", className)} aria-label={APP_NAME}>
        <Image
          src="/brand/logo-full.png"
          alt={`${APP_NAME} — Celebrate • Event • Ticket`}
          width={fullWidth}
          height={Math.round(fullWidth * 1.15)}
          className="h-auto w-auto max-w-full drop-shadow-sm transition-transform group-hover:scale-[1.01]"
          style={{ width: fullWidth, height: "auto" }}
          priority
        />
      </Link>
    );
  }

  if (iconOnly) {
    return (
      <Link href="/" className={cn("inline-flex group shrink-0", className)} aria-label={APP_NAME}>
        <Image
          src="/brand/logo-mark.png"
          alt=""
          width={markSize}
          height={markSize}
          className="shrink-0 drop-shadow-sm transition-transform group-hover:scale-[1.02]"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2.5 sm:gap-3 group shrink-0", className)} aria-label={APP_NAME}>
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={markSize}
        height={markSize}
        className="shrink-0 drop-shadow-sm transition-transform group-hover:scale-[1.02]"
        priority
      />
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
        {showTagline && !useFullImage && (
          <p
            className={cn(
              "text-[9px] uppercase tracking-[0.14em] mt-0.5 font-medium",
              isLight ? "text-slate-400" : "text-slate-500"
            )}
          >
            Celebrate • Event • Ticket
          </p>
        )}
      </div>
    </Link>
  );
}
