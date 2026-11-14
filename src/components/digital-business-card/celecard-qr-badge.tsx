"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  CELECARD_QR_CENTER_WELL,
  CELECARD_QR_TILE_FILL,
  resolveCeleCardQrCenter,
} from "@/lib/digital-business-card/qr-center";
import { CeleYouThemedMark } from "@/components/digital-business-card/celeyou-brand-mark";

export function CeleCardQrBadge({
  qrSrc,
  theme,
  avatarUrl,
  displayName,
  href,
  sizeClass,
  padClass = "p-0",
  ink,
}: {
  qrSrc?: string | null;
  theme: DigitalCardTheme;
  avatarUrl?: string | null;
  displayName?: string;
  href?: string | null;
  sizeClass: string;
  padClass?: string;
  ink?: string;
}) {
  const center = resolveCeleCardQrCenter(avatarUrl);
  const label = `Open ${displayName || "this"} CeleYou`;
  const official = center.kind === "mark";
  const well = official ? "rounded-[18%]" : "rounded-full";

  const wellPct = `${Math.round(CELECARD_QR_CENTER_WELL * 100)}%`;
  const mark = qrSrc ? (
    <span
      data-celecard-qr=""
      className={cn(
        "relative z-10 block shrink-0 overflow-hidden rounded-[0.7rem] bg-white shadow-[0_10px_22px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_3px_rgba(0,0,0,0.12)]",
        padClass,
        sizeClass
      )}
    >
      <span className="relative block h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={href ? "" : `${displayName || "CeleYou"} scan QR`}
          className="h-full w-full origin-center object-cover"
          style={{ transform: `scale(${CELECARD_QR_TILE_FILL})` }}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 m-auto overflow-hidden bg-white p-px shadow-[0_0_0_1.5px_#fff,0_1px_2px_rgba(15,23,42,0.2)]",
            well
          )}
          style={{ width: wellPct, height: wellPct }}
          aria-hidden
        >
          {center.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={center.src}
              alt=""
              decoding="async"
              draggable={false}
              className={cn("celecard-portrait-img h-full w-full object-cover object-center", well)}
            />
          ) : (
            <CeleYouThemedMark className="h-full w-full p-[10%]" />
          )}
        </span>
      </span>
    </span>
  ) : (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-md bg-white shadow-[0_8px_20px_rgba(0,0,0,0.2)]",
        padClass,
        sizeClass
      )}
      aria-hidden
    >
      <span
        className="block h-full w-full"
        style={{
          backgroundImage: `linear-gradient(${ink || theme.qrInk} 1px, transparent 1px), linear-gradient(90deg, ${ink || theme.qrInk} 1px, transparent 1px)`,
          backgroundSize: "22% 22%",
          opacity: 0.9,
        }}
      />
    </span>
  );

  if (!href || !qrSrc) return mark;
  const focusClass =
    "relative z-10 shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8A83]";
  if (href.startsWith("/")) {
    return (
      <Link
        href={href}
        aria-label={label}
        className={focusClass}
        onClick={(event) => event.stopPropagation()}
      >
        {mark}
      </Link>
    );
  }
  return (
    <a href={href} aria-label={label} className={focusClass} onClick={(event) => event.stopPropagation()}>
      {mark}
    </a>
  );
}
