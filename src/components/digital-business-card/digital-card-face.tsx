"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveDigitalCardTheme, type DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";

export type DigitalCardFaceProps = {
  themeId: string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  qrSrc?: string | null;
  className?: string;
  compact?: boolean;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function OrnamentLayer({ theme, compact }: { theme: DigitalCardTheme; compact?: boolean }) {
  const ornament = theme.ornament ?? "none";
  if (ornament === "none") return null;

  if (ornament === "halftone") {
    return (
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.2px)",
          backgroundSize: compact ? "7px 7px" : "9px 9px",
          color: theme.accent,
        }}
        aria-hidden
      />
    );
  }

  if (ornament === "sunburst") {
    return (
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-[140%] w-[70%] opacity-40"
        style={{
          background:
            "conic-gradient(from 210deg, transparent 0 8deg, rgba(232,200,114,0.35) 8deg 10deg, transparent 10deg 18deg)",
        }}
        aria-hidden
      />
    );
  }

  if (ornament === "kente") {
    return (
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-3 sm:w-4"
        style={{
          background:
            "repeating-linear-gradient(180deg, #fbbf24 0 6px, #b45309 6px 10px, #f59e0b 10px 14px, #7c2d12 14px 18px)",
        }}
        aria-hidden
      />
    );
  }

  if (ornament === "neon") {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0 12%, rgba(34,211,238,0.22) 12% 12.4%, transparent 12.4%), linear-gradient(0deg, transparent 0 78%, rgba(192,38,211,0.28) 78% 78.5%, transparent 78.5%)",
          boxShadow: `inset 0 0 40px ${theme.accentSoft}`,
        }}
        aria-hidden
      />
    );
  }

  if (ornament === "cel") {
    return (
      <div
        className="pointer-events-none absolute inset-2 rounded-xl border-[3px]"
        style={{ borderColor: theme.text }}
        aria-hidden
      >
        <span
          className="absolute right-3 top-3 h-10 w-16 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(105deg, transparent 0 6px, #0f172a 6px 7px)",
          }}
        />
      </div>
    );
  }

  if (ornament === "marquee") {
    const lights = Array.from({ length: compact ? 18 : 28 });
    return (
      <div className="pointer-events-none absolute inset-[6px] rounded-xl" aria-hidden>
        <div className="absolute inset-0 rounded-xl border-2" style={{ borderColor: theme.accent }} />
        <div className="absolute inset-0 flex justify-between px-1 pt-0.5">
          {lights.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: i % 2 === 0 ? theme.accent : "#fff7ed" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (ornament === "foil" || ornament === "crest") {
    return (
      <div className="pointer-events-none absolute inset-[8px] rounded-lg opacity-80" aria-hidden>
        <span className="absolute left-0 top-0 h-5 w-5 border-l border-t" style={{ borderColor: theme.accent }} />
        <span className="absolute right-0 top-0 h-5 w-5 border-r border-t" style={{ borderColor: theme.accent }} />
        <span className="absolute bottom-0 left-0 h-5 w-5 border-b border-l" style={{ borderColor: theme.accent }} />
        <span className="absolute bottom-0 right-0 h-5 w-5 border-b border-r" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  if (ornament === "wave" || ornament === "grid") {
    return (
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
    );
  }

  return null;
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

function TypePlate({
  theme,
  compact,
  className,
  children,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative rounded-xl", compact ? "px-2.5 py-1.5" : "px-3.5 py-2.5", className)}
      style={{
        background: plateFill(theme),
        boxShadow: isDarkInk(theme.text)
          ? "0 8px 22px rgba(15,23,42,0.12)"
          : "0 12px 28px rgba(0,0,0,0.38)",
      }}
    >
      {children}
    </div>
  );
}

function Caption({
  theme,
  compact,
  children,
}: {
  theme: DigitalCardTheme;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md font-semibold uppercase tracking-[0.14em]",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
      )}
      style={{ background: plateFill(theme), color: theme.text }}
    >
      {children}
    </span>
  );
}

function QrMark({
  qrSrc,
  compact,
  ink,
}: {
  qrSrc?: string | null;
  compact?: boolean;
  ink: string;
}) {
  const size = compact ? "h-9 w-9" : "h-[92px] w-[92px]";
  if (qrSrc) {
    return (
      <div className={cn("shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)]", size)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-md bg-white shadow-[0_8px_20px_rgba(0,0,0,0.2)]", size, compact ? "p-[3px]" : "p-1.5")}
      aria-hidden
    >
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`,
          backgroundSize: compact ? "28% 28%" : "22% 22%",
          opacity: 0.9,
        }}
      />
      <span className="absolute left-[3px] top-[3px] h-[7px] w-[7px] border-[1.5px]" style={{ borderColor: ink }} />
      <span className="absolute right-[3px] top-[3px] h-[7px] w-[7px] border-[1.5px]" style={{ borderColor: ink }} />
      <span className="absolute bottom-[3px] left-[3px] h-[7px] w-[7px] border-[1.5px]" style={{ borderColor: ink }} />
    </div>
  );
}

function Monogram({
  initials,
  theme,
  compact,
  portrait,
}: {
  initials: string;
  theme: DigitalCardTheme;
  compact?: boolean;
  portrait?: boolean;
}) {
  const box = compact ? (portrait ? "h-16 w-14" : "h-11 w-11") : portrait ? "h-[4.6rem] w-16" : "h-14 w-14";
  return (
    <div
      className={cn("flex items-center justify-center font-semibold tracking-tight", box, portrait ? "rounded-lg" : "rounded-full")}
      style={{
        background: plateFill(theme),
        color: theme.text,
        fontFamily: theme.fontHeading,
        boxShadow: isDarkInk(theme.text)
          ? "0 0 0 1px rgba(15,23,42,0.12), 0 8px 18px rgba(15,23,42,0.12)"
          : "0 0 0 1px rgba(255,255,255,0.18), 0 8px 18px rgba(0,0,0,0.28)",
      }}
      aria-hidden
    >
      {initials || "·"}
    </div>
  );
}

function CompactCardFace({
  theme,
  displayName,
  line,
  initials,
  avatarUrl,
  qrSrc,
}: {
  theme: DigitalCardTheme;
  displayName: string;
  line: string;
  initials: string;
  avatarUrl?: string | null;
  qrSrc?: string | null;
}) {
  const darkType = isDarkInk(theme.text);
  const portrait = theme.composition === "portrait-led";

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: darkType
            ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 38%, rgba(255,255,255,0.55) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 36%, rgba(0,0,0,0.62) 100%)",
        }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-0">
        {portrait ? (
          <div className="relative h-full w-[31%] overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover object-top" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: `linear-gradient(180deg, ${theme.accent} 0%, #0b1220 100%)`,
                }}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-sm font-semibold tracking-[0.08em] ring-1 ring-white/35"
                  style={{ fontFamily: theme.fontHeading, color: "#fff", background: "rgba(0,0,0,0.28)" }}
                >
                  {initials}
                </span>
              </div>
            )}
          </div>
        ) : null}

        <div className={cn("flex min-w-0 flex-1 flex-col justify-between", portrait ? "px-3 py-3" : "p-3.5")}>
          <div className="min-w-0">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: theme.accent }}
            >
              {theme.artLabel || theme.previewLabel}
            </p>
            <p
              className="mt-1 font-semibold leading-[1.05] tracking-tight [overflow-wrap:normal] [word-break:normal]"
              style={{
                fontFamily: theme.fontHeading,
                color: theme.text,
                fontSize: displayName.length > 16 ? "1.02rem" : "1.18rem",
                textShadow: darkType ? "0 1px 0 rgba(255,255,255,0.55)" : "0 8px 18px rgba(0,0,0,0.35)",
              }}
            >
              {displayName}
            </p>
            {line ? (
              <p
                className="mt-1 text-[11px] font-medium leading-snug"
                style={{ color: theme.text, opacity: 0.78 }}
              >
                {line}
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex items-end justify-between gap-2">
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: theme.text, opacity: 0.62 }}
            >
              Celeventic
            </span>
            <QrMark qrSrc={qrSrc} compact ink={theme.qrInk} />
          </div>
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
  className,
  compact,
}: DigitalCardFaceProps) {
  const theme = resolveDigitalCardTheme(themeId);
  const initials = initialsOf(displayName);
  const composition = theme.composition;
  const line = [title, company].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border shadow-[0_24px_60px_rgba(8,12,24,0.22)]",
        compact ? "aspect-[105/62]" : "aspect-[105/62] max-w-xl",
        className
      )}
      style={{
        background: theme.cardBackground,
        borderColor: theme.border,
        color: theme.text,
        fontFamily: theme.fontBody,
      }}
    >
      {theme.textureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.textureUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ opacity: composition === "iconic" ? 0.28 : 0.18, mixBlendMode: "luminosity" }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        aria-hidden
      >
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} compact={compact} />
      </div>
      {compact ? null : <OrnamentLayer theme={theme} compact={compact} />}
      {compact ? null : (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isDarkInk(theme.text)
              ? "linear-gradient(105deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 46%, transparent 72%)"
              : "linear-gradient(105deg, rgba(6,8,12,0.58) 0%, rgba(6,8,12,0.2) 46%, transparent 72%)",
          }}
          aria-hidden
        />
      )}

      {compact ? (
        <CompactCardFace
          theme={theme}
          displayName={displayName}
          line={line}
          initials={initials}
          avatarUrl={avatarUrl}
          qrSrc={qrSrc}
        />
      ) : composition === "portrait-led" ? (
        <div className={cn("relative flex h-full", compact ? "gap-3 p-3.5" : "gap-5 p-6")}>
          <div className="relative h-full w-[34%] overflow-hidden rounded-xl">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-end justify-center pb-3"
                style={{ background: plateFill(theme) }}
              >
                <span className={cn("font-semibold", compact ? "text-2xl" : "text-4xl")} style={{ fontFamily: theme.fontHeading, color: theme.text }}>
                  {initials}
                </span>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <TypePlate theme={theme} compact={compact} className="max-w-full">
              {theme.artLabel ? (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.text, opacity: 0.78 }}>
                  {theme.artLabel}
                </p>
              ) : null}
              <p className={cn("font-semibold leading-tight tracking-tight", compact ? "text-[15px]" : "text-[1.65rem]")} style={{ fontFamily: theme.fontHeading, color: theme.text }}>
                {displayName}
              </p>
              {line ? (
                <p className={cn("mt-1 truncate font-medium", compact ? "text-[11px]" : "text-sm")} style={{ color: theme.text, opacity: 0.82 }}>
                  {line}
                </p>
              ) : null}
            </TypePlate>
            <div className="flex items-end justify-between gap-2">
              <Caption theme={theme} compact={compact}>
                {SMARTCARD_PRODUCT_SHORT_NAME}
              </Caption>
              <QrMark qrSrc={qrSrc} compact={compact} ink={theme.qrInk} />
            </div>
          </div>
        </div>
      ) : composition === "type-first" ? (
        <div className={cn("relative flex h-full flex-col justify-between", compact ? "p-4" : "p-7")}>
          <TypePlate theme={theme} compact={compact} className="max-w-[92%]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.text, opacity: 0.78 }}>
              {theme.artLabel || "Identity"}
            </p>
            <p
              className={cn("mt-1 font-semibold leading-[0.95] tracking-tight", compact ? "text-[1.35rem]" : "text-[2.15rem]")}
              style={{ fontFamily: theme.fontHeading, color: theme.text }}
            >
              {displayName}
            </p>
            <div className="mt-2 h-px w-16" style={{ background: theme.text, opacity: 0.45 }} />
            {line ? (
              <p className={cn("mt-2 truncate font-medium", compact ? "text-[11px]" : "text-sm")} style={{ color: theme.text, opacity: 0.82 }}>
                {line}
              </p>
            ) : null}
          </TypePlate>
          <div className="flex items-end justify-between">
            <Caption theme={theme} compact={compact}>
              Scan to connect
            </Caption>
            <QrMark qrSrc={qrSrc} compact={compact} ink={theme.qrInk} />
          </div>
        </div>
      ) : composition === "grid" ? (
        <div className={cn("relative grid h-full grid-cols-[8px_1fr_auto] items-center", compact ? "gap-3 p-3.5" : "gap-4 p-6")}>
          <div className="h-full rounded-full" style={{ background: theme.accent }} />
          <TypePlate theme={theme} compact={compact} className="min-w-0">
            <p className={cn("truncate font-semibold tracking-tight", compact ? "text-sm" : "text-xl")} style={{ fontFamily: theme.fontHeading, color: theme.text }}>
              {displayName}
            </p>
            {line ? (
              <p className={cn("mt-1 truncate font-medium", compact ? "text-[11px]" : "text-xs")} style={{ color: theme.text, opacity: 0.82 }}>
                {line}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.text, opacity: 0.78 }}>
              {SMARTCARD_PRODUCT_SHORT_NAME}
            </p>
          </TypePlate>
          <QrMark qrSrc={qrSrc} compact={compact} ink={theme.qrInk} />
        </div>
      ) : composition === "media-first" || composition === "iconic" ? (
        <div className={cn("relative flex h-full flex-col justify-between", compact ? "p-3.5" : "p-6")}>
          <div className="flex items-start justify-between gap-3">
            <TypePlate theme={theme} compact={compact} className="min-w-0 max-w-[78%]">
              {theme.artLabel ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.text, opacity: 0.78 }}>
                  {theme.artLabel}
                </p>
              ) : null}
              <p className={cn("font-semibold leading-tight", compact ? "text-[15px]" : "text-2xl")} style={{ fontFamily: theme.fontHeading, color: theme.text }}>
                {displayName}
              </p>
              {line ? (
                <p className={cn("mt-0.5 truncate font-medium", compact ? "text-[11px]" : "text-xs")} style={{ color: theme.text, opacity: 0.82 }}>
                  {line}
                </p>
              ) : null}
            </TypePlate>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className={cn("rounded-full object-cover ring-2", compact ? "h-10 w-10" : "h-12 w-12")} style={{ boxShadow: `0 0 0 2px ${theme.accent}` }} />
            ) : (
              <Monogram initials={initials} theme={theme} compact={compact} />
            )}
          </div>
          <div className="flex items-end justify-between">
            <Caption theme={theme} compact={compact}>
              Live while subscribed
            </Caption>
            <QrMark qrSrc={qrSrc} compact={compact} ink={theme.qrInk} />
          </div>
        </div>
      ) : (
        <div className={cn("relative flex h-full items-center", compact ? "gap-3 px-4 py-3" : "gap-5 px-7 py-5")}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className={cn("rounded-full object-cover", compact ? "h-11 w-11" : "h-14 w-14")} />
          ) : (
            <Monogram initials={initials} theme={theme} compact={compact} />
          )}
          <TypePlate theme={theme} compact={compact} className="min-w-0 flex-1">
            <p className={cn("truncate font-semibold tracking-tight", compact ? "text-[15px]" : "text-2xl")} style={{ fontFamily: theme.fontHeading, color: theme.text }}>
              {displayName}
            </p>
            {line ? (
              <p className={cn("mt-1 truncate font-medium", compact ? "text-[11px]" : "text-sm")} style={{ color: theme.text, opacity: 0.82 }}>
                {line}
              </p>
            ) : null}
            <p className={cn("mt-1.5 font-semibold uppercase tracking-[0.14em]", compact ? "text-[10px]" : "text-[11px]")} style={{ color: theme.text, opacity: 0.78 }}>
              {theme.artLabel || SMARTCARD_PRODUCT_SHORT_NAME}
            </p>
          </TypePlate>
          <QrMark qrSrc={qrSrc} compact={compact} ink={theme.qrInk} />
        </div>
      )}
    </div>
  );
}
