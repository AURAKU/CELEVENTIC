"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resolveDigitalCardTheme, type DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { CELEYOU_MARK_SRC } from "@/components/digital-business-card/celeyou-brand-mark";
import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";
import {
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import {
  celecardDisplayNameLines,
  celecardTypeVoice,
  type CeleCardTypeVoice,
} from "@/lib/digital-business-card/type-voice";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DemoCompanyMark } from "@/components/digital-business-card/demo-company-mark";

export type DigitalCardFaceProps = {
  themeId: string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  /** Live webpage tap. Canonical public profile, never the owner dashboard. */
  qrHref?: string | null;
  /** Tap the QR only. Dummy previews send explorers to the template gallery. */
  qrBadgeHref?: string | null;
  /** Dummy or saved company mark next to the house name. */
  companyLogo?: boolean;
  className?: string;
  compact?: boolean;
  /** Circle, square, or soft-square. Theme default if omitted. */
  portraitFrame?: CeleCardPortraitFrame | null;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function HouseFrame({
  theme,
  compact,
  rich = true,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
  rich?: boolean;
}) {
  const inset = compact ? "inset-[1.4cqw]" : "inset-[2cqw]";
  const corner = compact ? "h-[3.2cqw] w-[3.2cqw]" : "h-[4.4cqw] w-[4.4cqw]";
  const gap = compact ? "16cqw" : "19cqw";
  const topMask = `linear-gradient(90deg, #000 0, #000 calc(50% - ${gap}), transparent calc(50% - ${gap} + 2.4cqw), transparent calc(50% + ${gap} - 2.4cqw), #000 calc(50% + ${gap}), #000 100%)`;
  return (
    <div className={cn("pointer-events-none absolute rounded-[14px]", inset)} aria-hidden>
      <div
        className="absolute inset-0 rounded-[12px]"
        style={{ boxShadow: `inset 0 0 0 1px ${theme.border}`, WebkitMaskImage: topMask, maskImage: topMask }}
      />
      {rich ? (
        <div
          className="absolute inset-[4px] rounded-[10px] opacity-70"
          style={{ boxShadow: `inset 0 0 0 1px ${theme.accent}`, WebkitMaskImage: topMask, maskImage: topMask }}
        />
      ) : null}
      <span className={cn("absolute left-0 top-0 border-l-2 border-t-2", corner)} style={{ borderColor: theme.accent }} />
      <span className={cn("absolute right-0 top-0 border-r-2 border-t-2", corner)} style={{ borderColor: theme.accent }} />
      <span className={cn("absolute bottom-0 left-0 border-b-2 border-l-2", corner)} style={{ borderColor: theme.accent }} />
      <span className={cn("absolute bottom-0 right-0 border-b-2 border-r-2", corner)} style={{ borderColor: theme.accent }} />
    </div>
  );
}

function OrnamentLayer({ theme, compact }: { theme: DigitalCardTheme; compact?: boolean }) {
  const ornament = theme.ornament ?? "foil";
  const unique =
    ornament === "halftone" ||
    ornament === "sunburst" ||
    ornament === "kente" ||
    ornament === "neon" ||
    ornament === "cel" ||
    ornament === "marquee" ||
    ornament === "wave" ||
    ornament === "grid";

  return (
    <>
      <HouseFrame theme={theme} compact={compact} rich={!unique} />
      {ornament === "halftone" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.2px)",
            backgroundSize: compact ? "7px 7px" : "9px 9px",
            color: theme.accent,
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "sunburst" ? (
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-[140%] w-[70%] opacity-40"
          style={{
            background:
              "conic-gradient(from 210deg, transparent 0 8deg, rgba(232,200,114,0.35) 8deg 10deg, transparent 10deg 18deg)",
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "kente" ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-3 sm:w-4"
          style={{
            background:
              "repeating-linear-gradient(180deg, #fbbf24 0 6px, #b45309 6px 10px, #f59e0b 10px 14px, #7c2d12 14px 18px)",
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "neon" ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0 12%, rgba(34,211,238,0.22) 12% 12.4%, transparent 12.4%), linear-gradient(0deg, transparent 0 78%, rgba(192,38,211,0.28) 78% 78.5%, transparent 78.5%)",
            boxShadow: `inset 0 0 40px ${theme.accentSoft}`,
          }}
          aria-hidden
        />
      ) : null}
      {ornament === "cel" ? (
        <div
          className="pointer-events-none absolute inset-2 rounded-xl border-[3px]"
          style={{ borderColor: theme.text }}
          aria-hidden
        >
          <span
            className="absolute right-3 top-3 h-10 w-16 opacity-30"
            style={{
              background: "repeating-linear-gradient(105deg, transparent 0 6px, #0f172a 6px 7px)",
            }}
          />
        </div>
      ) : null}
      {ornament === "marquee" ? (
        <div className="pointer-events-none absolute inset-[6px] rounded-xl" aria-hidden>
          <div className="absolute inset-0 rounded-xl border-2" style={{ borderColor: theme.accent }} />
          <div className="absolute inset-0 flex justify-between px-1 pt-0.5">
            {Array.from({ length: compact ? 18 : 28 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i % 2 === 0 ? theme.accent : "#fff7ed" }}
              />
            ))}
          </div>
        </div>
      ) : null}
      {ornament === "wave" || ornament === "grid" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              ornament === "grid"
                ? `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`
                : undefined,
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />
      ) : null}
    </>
  );
}

function isDarkInk(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

function plateFill(theme: DigitalCardTheme) {
  return isDarkInk(theme.text) ? "rgba(255,255,255,0.97)" : "rgba(8,10,16,0.94)";
}

function PaperFinish({ theme }: { theme: DigitalCardTheme }) {
  const lightPaper = isDarkInk(theme.text);
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: lightPaper
            ? `radial-gradient(ellipse at 12% 8%, ${theme.accent}2e 0%, transparent 38%), radial-gradient(ellipse at 92% 88%, ${theme.accent}24 0%, transparent 46%), linear-gradient(118deg, rgba(255,252,245,0.28) 0%, transparent 36%, rgba(120,70,20,0.08) 100%)`
            : `radial-gradient(ellipse at 16% 0%, rgba(255,255,255,0.16) 0%, transparent 40%), linear-gradient(160deg, rgba(0,0,0,0.08) 0%, transparent 55%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 2px, rgba(90,58,18,0.05) 2px 3px), repeating-linear-gradient(90deg, transparent 0 3px, rgba(90,58,18,0.035) 3px 4px)",
        }}
        aria-hidden
      />
    </>
  );
}

function originPlate(theme: DigitalCardTheme, edge: "top" | "bottom") {
  return {
    background: theme.cardBackground,
    backgroundSize: "100cqw calc(100cqw * 54 / 85.6)",
    backgroundPosition: edge === "top" ? "center 0" : "center 100%",
    backgroundRepeat: "no-repeat",
  } as const;
}

function CeleCardOrigin({
  theme,
  compact,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
      aria-label={SMARTCARD_PRODUCT_SHORT_NAME}
    >
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-full",
          compact ? "mt-[0.9cqw] h-[7cqw] w-[14cqw]" : "mt-[1.1cqw] h-[8.2cqw] w-[16.4cqw]"
        )}
        style={originPlate(theme, "top")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CELEYOU_MARK_SRC}
          alt=""
          className={compact ? "h-[5.6cqw] w-[5.6cqw] object-contain" : "h-[6.6cqw] w-[6.6cqw] object-contain"}
        />
      </span>
    </div>
  );
}

function CeleCardWordmark({
  theme,
  compact,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
}) {
  const lightPlate = isDarkInk(theme.text);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center" aria-hidden>
      <span
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-full font-display font-bold tracking-[-0.04em]",
          compact ? "mb-[0.85cqw] h-[5.2cqw] px-[3.4cqw] text-[2.35cqw]" : "mb-[1cqw] h-[6cqw] px-[4cqw] text-[2.7cqw]"
        )}
        style={originPlate(theme, "bottom")}
      >
        <span style={{ color: lightPlate ? "#073F3C" : "#FFFFFF" }}>Cele</span><span style={{ color: lightPlate ? "#12B8A8" : "#7FF0E4" }}>You</span>
      </span>
    </div>
  );
}

function FaceIdentity({
  theme,
  displayName,
  title,
  company,
  compact,
  companyLogo,
  nameClassName,
  nameStyle,
}: {
  theme: DigitalCardTheme;
  displayName: string;
  title?: string | null;
  company?: string | null;
  compact?: boolean;
  companyLogo?: boolean;
  mark?: boolean;
  nameClassName?: string;
  nameStyle?: CSSProperties;
}) {
  const voice = celecardTypeVoice(theme);
  const nameLines = celecardDisplayNameLines(displayName, voice.stacksDisplayName);
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn("celecard-face-name min-w-0", nameLines.length > 1 ? null : "line-clamp-2", nameClassName)}
        style={{
          fontFamily: voice.heading,
          fontWeight: voice.nameWeight,
          letterSpacing: voice.nameTracking,
          color: theme.text,
          ...nameStyle,
        }}
      >
        {nameLines.map((line, index) => (
          <span key={`${line}-${index}`} className="block">
            {line}
          </span>
        ))}
      </p>
      {voice.rule === "foil" ? (
        <span className={cn("mt-[2.2cqw] block h-px", compact ? "w-[11cqw]" : "w-[10cqw]")} style={{ background: theme.accent, opacity: 0.7 }} aria-hidden />
      ) : voice.rule === "double" ? (
        <span className="mt-[2.2cqw] block w-[11cqw]" aria-hidden>
          <span className="block h-px" style={{ background: theme.accent, opacity: 0.85 }} />
          <span className="mt-[0.45cqw] block h-px" style={{ background: theme.accent, opacity: 0.4 }} />
        </span>
      ) : voice.rule === "bar" ? (
        <span className={cn("mt-[2.2cqw] block h-[0.55cqw]", compact ? "w-[10cqw]" : "w-[9cqw]")} style={{ background: theme.accent }} aria-hidden />
      ) : null}
      {title ? (
        <p
          className={cn(
            "celecard-face-title mt-[1.8cqw] leading-snug break-words",
            compact ? "line-clamp-2" : null,
            voice.companyTransform === "uppercase" && voice.originStyle === "credit" ? "uppercase" : null
          )}
          style={{
            color: theme.text,
            opacity: 0.88,
            fontFamily: voice.title,
            fontStyle: voice.titleItalic ? "italic" : "normal",
            fontWeight: 500,
            letterSpacing: voice.titleTracking,
          }}
        >
          {title}
        </p>
      ) : null}
      {company ? (
        <span
          className={cn(
            "celecard-face-company flex min-w-0 items-center font-semibold",
            compact ? "mt-[0.8cqw] gap-[1cqw]" : "mt-[0.4cqw] gap-[1.15cqw]"
          )}
        >
          {companyLogo ? (
            <DemoCompanyMark
              name={company}
              accent={theme.accent}
              metal={theme.border}
              className={compact ? "h-[4.4cqw] w-[4.4cqw]" : "h-[5.2cqw] w-[5.2cqw]"}
            />
          ) : null}
          <span
            className={cn("min-w-0 break-words", compact ? "line-clamp-1" : null, voice.companyTransform === "uppercase" ? "uppercase" : null)}
            style={{ color: theme.accent, fontFamily: voice.origin, letterSpacing: voice.companyTracking }}
          >
            {company}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function QrMark({
  qrSrc,
  qrHref,
  ownerName,
  theme,
  avatarUrl,
}: {
  qrSrc?: string | null;
  qrHref?: string | null;
  ownerName?: string;
  compact?: boolean;
  theme: DigitalCardTheme;
  avatarUrl?: string | null;
}) {
  return (
    <CeleCardQrBadge
      qrSrc={qrSrc}
      href={qrHref}
      theme={theme}
      avatarUrl={avatarUrl}
      displayName={ownerName}
      ink={theme.qrInk}
      padClass="p-0"
      sizeClass="celecard-face-qr"
    />
  );
}

function portraitBox(portrait?: boolean) {
  return portrait ? "celecard-face-photo is-portrait-box" : "celecard-face-photo";
}

function FacePhoto({
  avatarUrl,
  theme,
  portrait,
  displayName,
  portraitFrame,
}: {
  avatarUrl?: string | null;
  initials?: string;
  theme: DigitalCardTheme;
  compact?: boolean;
  portrait?: boolean;
  displayName: string;
  portraitFrame?: CeleCardPortraitFrame | null;
}) {
  const frame = resolveCeleCardPortraitFrame(theme, portraitFrame);
  const box = portraitBox(portrait || frame === "rounded");
  const well = portrait
    ? "rounded-[1.8cqw]"
    : frame === "square"
      ? "rounded-[0.55cqw]"
      : frame === "rounded"
        ? "rounded-[1.7cqw]"
        : "rounded-full";
  const houseRounded = frame === "circle" && !portrait ? "full" : frame === "square" && !portrait ? "none" : "lg";
  const mark = !isCeleCardPhotoUrl(avatarUrl) ? (
    <DigitalCardHouseAvatar
      theme={theme}
      avatarUrl={avatarUrl}
      rounded={houseRounded}
      className={cn("h-full w-full", well)}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl || undefined}
      alt={`${displayName} portrait`}
      className={cn("h-full w-full object-cover object-center", well)}
    />
  );
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden p-[0.55cqw]", box, well)}
      style={{
        background: `linear-gradient(145deg, ${theme.border} 0%, ${theme.accent} 46%, ${theme.border} 100%)`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.38), 0 10px 22px rgba(8,10,16,0.22), inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      {mark}
    </span>
  );
}

function FacePortraitPanel({
  avatarUrl,
  theme,
  displayName,
}: {
  avatarUrl?: string | null;
  theme: DigitalCardTheme;
  displayName: string;
}) {
  if (isCeleCardPhotoUrl(avatarUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl || undefined} alt={`${displayName} portrait`} className="h-full w-full object-cover object-center" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: plateFill(theme) }}>
      <DigitalCardHouseAvatar theme={theme} avatarUrl={avatarUrl} className="h-[72%] w-[72%]" />
    </div>
  );
}

function CardPlate({
  theme,
  displayName,
  title,
  company,
  initials,
  avatarUrl,
  qrSrc,
  qrHref,
  compact,
  portraitFrame,
  companyLogo,
}: {
  theme: DigitalCardTheme;
  displayName: string;
  title?: string | null;
  company?: string | null;
  initials: string;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  qrHref?: string | null;
  compact?: boolean;
  portraitFrame?: CeleCardPortraitFrame | null;
  companyLogo?: boolean;
}) {
  const darkType = isDarkInk(theme.text);
  const portrait = theme.composition === "portrait-led";
  const nameSize = compact
    ? displayName.length > 22
      ? "5.4cqw"
      : displayName.length > 14
        ? "6.2cqw"
        : "6.8cqw"
    : undefined;
  const emboss = darkType
    ? "0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(40,24,8,0.16)"
    : "0 1px 0 rgba(255,255,255,0.22), 0 2px 10px rgba(0,0,0,0.28)";

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: darkType
            ? "linear-gradient(180deg, rgba(255,248,235,0.12) 0%, transparent 46%, rgba(120,70,20,0.08) 100%)"
            : "linear-gradient(165deg, rgba(255,255,255,0.1) 0%, transparent 42%, rgba(0,0,0,0.22) 100%)",
        }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-0 items-stretch">
        {portrait ? (
          <div className="relative h-full w-[36%] shrink-0 overflow-hidden">
            <FacePortraitPanel avatarUrl={avatarUrl} theme={theme} displayName={displayName} />
          </div>
        ) : null}

        <div className={cn("celecard-face-row min-w-0 flex-1", portrait ? "is-portrait" : null)}>
          {portrait ? null : (
            <FacePhoto
              avatarUrl={avatarUrl}
              initials={initials}
              theme={theme}
              compact={compact}
              displayName={displayName}
              portraitFrame={portraitFrame}
            />
          )}
          <FaceIdentity
            theme={theme}
            displayName={displayName}
            title={title}
            company={company}
            compact={compact}
            companyLogo={companyLogo}
            nameClassName="[overflow-wrap:normal] [word-break:normal]"
            nameStyle={{
              fontSize: nameSize,
              textShadow: emboss,
            }}
          />
          <QrMark
            qrSrc={qrSrc}
            qrHref={qrHref}
            ownerName={displayName}
            compact={compact}
            theme={theme}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>
    </>
  );
}

export function DigitalCardFace({
  themeId,
  displayName,
  title,
  company,
  avatarUrl,
  qrSrc,
  qrHref,
  qrBadgeHref,
  className,
  compact,
  portraitFrame,
  companyLogo,
}: DigitalCardFaceProps) {
  const theme = resolveDigitalCardTheme(themeId);
  const voice = celecardTypeVoice(theme);
  const initials = initialsOf(displayName);
  const composition = theme.composition;

  const plate = (
    <div
      className="celecard-face celecard-foil relative overflow-hidden rounded-[1.15rem] border"
      data-compact={compact ? "true" : undefined}
      style={{
        background: theme.cardBackground,
        borderColor: theme.border,
        color: theme.text,
        fontFamily: voice.meta,
        ["--celecard-accent" as string]: theme.accent,
        boxShadow: `0 18px 44px rgba(8,12,24,0.28), 0 1px 0 rgba(255,255,255,0.28), inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -3px 8px rgba(0,0,0,0.14), inset 0 0 0 1px ${theme.border}`,
      }}
    >
      {theme.textureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.textureUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: composition === "iconic" ? 0.22 : 0.16, mixBlendMode: "luminosity" }}
        />
      ) : null}
      <PaperFinish theme={theme} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} compact={compact} />
      </div>
      <OrnamentLayer theme={theme} compact={compact} />
      <CeleCardOrigin theme={theme} compact={compact} />
      <CeleCardWordmark theme={theme} compact={compact} />
      <CardPlate
        theme={theme}
        displayName={displayName}
        title={title}
        company={company}
        initials={initials}
        avatarUrl={avatarUrl}
        qrSrc={qrSrc}
        qrHref={qrBadgeHref ?? null}
        compact={compact}
        portraitFrame={portraitFrame}
        companyLogo={companyLogo}
      />
    </div>
  );

  const label = `Open ${displayName || "this"} CeleYou`;
  const wrapClass = cn("block w-full min-w-0", className);
  if (qrHref) {
    const focusClass =
      "rounded-[1.15rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8A83]";
    if (qrHref.startsWith("/")) {
      return (
        <Link href={qrHref} aria-label={label} className={cn(wrapClass, focusClass)}>
          {plate}
        </Link>
      );
    }
    return (
      <a href={qrHref} aria-label={label} className={cn(wrapClass, focusClass)}>
        {plate}
      </a>
    );
  }
  return <div className={wrapClass}>{plate}</div>;
}
