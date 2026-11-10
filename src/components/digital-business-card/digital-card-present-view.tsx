"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, QrCode, UserRound, X } from "lucide-react";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { digitalCardPublicUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { smartCardShortUrl } from "@/lib/digital-business-card/product";
import { sanitizePublicUrl } from "@/lib/app-url";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";
import { useEmbeddedCardShare } from "@/components/digital-business-card/use-embedded-card-share";

type FullscreenNode = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function fullscreenElement() {
  const doc = document as FullscreenDoc;
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

function fullscreenAvailable() {
  if (typeof document === "undefined") return false;
  const node = document.documentElement as FullscreenNode;
  return Boolean(node.requestFullscreen || node.webkitRequestFullscreen);
}

async function requestNodeFullscreen(node: HTMLElement) {
  const target = node as FullscreenNode;
  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }
  target.webkitRequestFullscreen?.();
}

async function exitNodeFullscreen() {
  const doc = document as FullscreenDoc;
  if (document.exitFullscreen && document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  doc.webkitExitFullscreen?.();
}

export function DigitalCardPresentView({
  card,
  origin,
  wantImmersive = false,
  hostCardId = null,
  proximityDiscoverable = true,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
  wantImmersive?: boolean;
  hostCardId?: string | null;
  proximityDiscoverable?: boolean;
}) {
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), card.socials.design);
  const motionMood = celecardMotionMood(theme);
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const shortUrl = smartCardShortUrl(card.publicToken, origin);
  const profileUrl = digitalCardPublicUrl(card.slug);
  const shareUrl = sanitizePublicUrl(
    profileUrl.startsWith("http") ? profileUrl : `${origin.replace(/\/$/, "")}${profileUrl}`,
    origin
  );
  const qrSrc = digitalCardQrImageSrc(shortUrl, 1024);
  const { sharingLive, sent, sendFromCard } = useEmbeddedCardShare({
    card,
    profileUrl: shareUrl,
    hostCardId,
    discoverable: proximityDiscoverable,
  });
  const [landscape, setLandscape] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);
  const [fsHint, setFsHint] = useState(wantImmersive);
  const [canFs, setCanFs] = useState(false);

  useEffect(() => {
    setCanFs(fullscreenAvailable());
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const apply = () => setLandscape(landscapeQuery.matches);
    apply();
    landscapeQuery.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    function onFs() {
      setNativeFs(Boolean(fullscreenElement()));
    }
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      landscapeQuery.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  const exitPresent = useCallback(() => {
    if (fullscreenElement()) void exitNodeFullscreen().catch(() => undefined);
  }, []);

  const closePresent = useCallback(() => {
    exitPresent();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(profileUrl);
  }, [exitPresent, profileUrl, router]);

  const toggleFullscreen = useCallback(async () => {
    setFsHint(false);
    const node = rootRef.current;
    if (!node || !fullscreenAvailable()) return;
    try {
      if (fullscreenElement()) {
        await exitNodeFullscreen();
        return;
      }
      await requestNodeFullscreen(node);
    } catch {
      /* CSS already fills the viewport. */
    }
  }, []);

  if (!card.isLive) {
    if (card.presentationMode === "courtesy") {
      return <DigitalCardContinuityView card={card} />;
    }
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-stone-950 px-4 text-center text-stone-100">
        <div>
          <DigitalCardUnavailableView mode={card.presentationMode} />
          <Link href="/digital-cards" className="mt-4 inline-block text-sm text-[#7dd3c7]">
            See templates
          </Link>
        </div>
      </main>
    );
  }

  const chromePad = landscape ? "2.75rem" : "8.5rem";
  const stageWidth = landscape
    ? `min(100%, calc((100dvh - ${chromePad}) * 85.6 / 54))`
    : `min(100%, 46rem, calc((100dvh - ${chromePad}) * 85.6 / 54))`;

  return (
    <main
      ref={rootRef}
      className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto"
      data-celecard-mood={motionMood}
      data-celecard-present="true"
      style={{
        background: theme.stageBackground,
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.2]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <header
        className={`z-30 flex items-center justify-between gap-2 px-1 ${
          landscape ? "pointer-events-none absolute inset-x-0 top-0 pt-[max(0.5rem,env(safe-area-inset-top))]" : "relative shrink-0 pb-2"
        }`}
      >
        <button
          type="button"
          onClick={closePresent}
          className="pointer-events-auto inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ background: "rgba(0,0,0,0.28)", color: "#fffef8" }}
          aria-label="Close card mode"
        >
          <X className="h-3.5 w-3.5" />
          {landscape ? null : <span>Close</span>}
        </button>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          {landscape ? (
            <Link
              href={profileUrl}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full"
              style={{ color: theme.accent, background: theme.accentSoft }}
              aria-label="Open profile"
            >
              <UserRound className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href={profileUrl}
              className="inline-flex min-h-10 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: theme.accent, background: theme.accentSoft }}
            >
              Open profile
            </Link>
          )}
          {canFs ? (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(0,0,0,0.28)", color: "#fffef8" }}
              aria-label={nativeFs ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {nativeFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="flex w-full max-w-full flex-col items-center justify-center">
          <div className="w-full max-w-full" style={{ width: stageWidth }}>
            <div
              onClick={(event) => {
                if ((event.target as HTMLElement | null)?.closest("a")) return;
                void sendFromCard();
              }}
              aria-label="Tap this card to send the profile from this phone"
              className={`block cursor-pointer rounded-[1.35rem] ${
                sharingLive
                  ? "ring-2 ring-[#7FF0E4]/80 ring-offset-2 ring-offset-transparent"
                  : "ring-2 ring-white/25 ring-offset-2 ring-offset-transparent"
              }`}
            >
              <DigitalCardFace
                themeId={card.themeId}
                displayName={card.displayName}
                title={card.title}
                company={card.company}
                avatarUrl={card.avatarUrl}
                qrSrc={qrSrc}
                qrBadgeHref={profileUrl}
                className="max-w-none shadow-[0_28px_80px_rgba(0,0,0,0.38)]"
                portraitFrame={card.socials.portraitFrame}
                companyLogoUrl={card.socials.companyLogoUrl}
                design={card.socials.design}
              />
            </div>
          </div>
        </div>
        <p
          className={`max-w-sm text-center text-[11px] font-medium leading-relaxed motion-reduce:transition-none ${
            landscape ? "mt-2" : "mt-4"
          }`}
          style={{ color: theme.muted }}
        >
          {sent === "shared"
            ? "Sent from this phone. Their phone opens the same profile."
            : sent === "copied"
              ? "Link copied. Hand it to them or keep the plate facing their camera."
              : sent === "unavailable"
                ? "Keep the plate facing their camera. They scan and the profile opens."
                : "Bring their phone to this card. They scan the plate and the profile opens. They do not need CeleYou. Tap the card to send it from this phone."}
        </p>
        {landscape ? null : (
          <ScanPlate
            qrSrc={qrSrc}
            href={profileUrl}
            displayName={card.displayName}
            accent={theme.accent}
            theme={theme}
            avatarUrl={card.avatarUrl}
          />
        )}
      </div>

      {fsHint && canFs ? (
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="absolute inset-x-0 bottom-0 top-14 z-20 grid place-items-center bg-black/45 px-6 text-center"
        >
          <span className="rounded-2xl bg-white/95 px-5 py-4 text-sm font-semibold text-stone-900 shadow-xl">
            Tap to fill the screen
          </span>
        </button>
      ) : null}
    </main>
  );
}

function ScanPlate({
  qrSrc,
  href,
  displayName,
  accent,
  theme,
  avatarUrl,
  compact = false,
}: {
  qrSrc: string;
  href: string;
  displayName: string;
  accent: string;
  theme: ReturnType<typeof resolveDigitalCardTheme>;
  avatarUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`Open ${displayName} CeleYou`}
      className={`flex shrink-0 flex-col items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8A83] ${compact ? "gap-1" : "mt-3 gap-1.5"}`}
    >
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: accent }}
      >
        <QrCode className="h-3 w-3" />
        Scan
      </span>
      <CeleCardQrBadge
        qrSrc={qrSrc}
        theme={theme}
        avatarUrl={avatarUrl}
        displayName={displayName}
        sizeClass={compact ? "h-44 w-44" : "h-52 w-52"}
        padClass="p-0"
      />
    </Link>
  );
}
