"use client";

import { cn } from "@/lib/utils";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";

export type DigitalCardFaceProps = {
  themeId: DigitalCardThemeId | string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  className?: string;
  compact?: boolean;
};

export function DigitalCardFace({
  themeId,
  displayName,
  title,
  company,
  avatarUrl,
  qrSrc,
  className,
  compact,
}: DigitalCardFaceProps) {
  const theme = resolveDigitalCardTheme(themeId);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border shadow-[0_20px_50px_rgba(15,23,42,0.12)]",
        compact ? "aspect-[105/60]" : "aspect-[105/60] max-w-xl",
        className
      )}
      style={{
        background: theme.cardBackground,
        borderColor: theme.border,
        color: theme.text,
        fontFamily: theme.fontBody,
      }}
    >
      <div
        className="pointer-events-none absolute inset-[10px] rounded-xl border opacity-80"
        style={{ borderColor: theme.border }}
        aria-hidden
      />
      <div className={cn("relative flex h-full items-center gap-4", compact ? "px-5 py-4" : "px-8 py-6")}>
        <div className="min-w-0 flex-1">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className={cn("mb-3 rounded-full object-cover", compact ? "h-10 w-10" : "h-14 w-14")}
            />
          ) : (
            <div
              className={cn(
                "mb-3 flex items-center justify-center rounded-full font-semibold",
                compact ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg"
              )}
              style={{ background: theme.accentSoft, color: theme.accent }}
              aria-hidden
            >
              {initials || "·"}
            </div>
          )}
          <p
            className={cn("truncate font-semibold tracking-tight", compact ? "text-base" : "text-2xl")}
            style={{ fontFamily: theme.fontHeading, color: theme.accent }}
          >
            {displayName}
          </p>
          {(title || company) && (
            <p className={cn("mt-1 truncate", compact ? "text-xs" : "text-sm")} style={{ color: theme.muted }}>
              {[title, company].filter(Boolean).join(" · ")}
            </p>
          )}
          <p
            className={cn("mt-3 uppercase tracking-[0.18em]", compact ? "text-[9px]" : "text-[10px]")}
            style={{ color: theme.muted }}
          >
            Digital business card
          </p>
        </div>
        {qrSrc ? (
          <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt=""
              className={cn(compact ? "h-16 w-16" : "h-24 w-24")}
              width={compact ? 64 : 96}
              height={compact ? 64 : 96}
            />
          </div>
        ) : (
          <div
            className={cn("shrink-0 rounded-xl bg-white/90", compact ? "h-16 w-16" : "h-24 w-24")}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
