"use client";

import Link from "next/link";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { digitalCardIdentityUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import { digitalCardExportImagePath, digitalCardPresentPath } from "@/lib/digital-business-card/share";
import { walletPassGuidance } from "@/lib/celeyou-share/wallet-pass";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";

export function DigitalCardWalletView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), card.socials.design);
  const motionMood = celecardMotionMood(theme, card.socials.design?.motion);
  const qrUrl = celeYouCameraScanUrl(card.publicToken, origin);
  const profileUrl = digitalCardIdentityUrl(card.slug, origin);
  const qrSrc = qrUrl ? digitalCardQrImageSrc(qrUrl, { size: 720, format: "png" }) : "";

  if (card.presentationMode === "courtesy") {
    return <DigitalCardContinuityView card={card} />;
  }
  if (card.presentationMode && card.presentationMode !== "live") {
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  return (
    <main
      className="celecard-stage relative min-h-app-viewport overflow-hidden px-5 pb-12 pt-8"
      data-celecard-mood={motionMood}
      style={{ background: theme.stageBackground }}
    >
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>
      <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center gap-5">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
          Wallet card
        </p>
        <DigitalCardFace
          themeId={card.themeId}
          displayName={card.displayName}
          title={card.title}
          company={card.company}
          avatarUrl={card.avatarUrl}
          qrSrc={qrSrc}
          qrHref={profileUrl}
          portraitFrame={card.socials.portraitFrame}
          companyLogo
          companyLogoUrl={card.socials.companyLogoUrl}
          design={card.socials.design}
        />
        {qrSrc ? (
          <CeleCardQrBadge
            qrSrc={qrSrc}
            href={profileUrl}
            theme={theme}
            avatarUrl={card.avatarUrl}
            displayName={card.displayName}
            sizeClass="h-44 w-44"
            padClass="p-0"
          />
        ) : null}
        <p className="text-center text-sm leading-relaxed" style={{ color: theme.text }}>
          Hold this up. Anyone can scan it and open your public profile. They do not need CeleYou or an account.
        </p>
        <p className="text-center text-[12px] leading-relaxed" style={{ color: theme.muted }}>
          {walletPassGuidance()}
        </p>
        <div className="flex w-full flex-col gap-2">
          <a
            href={digitalCardExportImagePath(card.slug)}
            className="grid h-11 place-items-center rounded-full text-sm font-semibold"
            style={{ background: theme.accent, color: "#fff" }}
          >
            Save card image
          </a>
          <Link
            href={digitalCardPresentPath(card.slug, { immersive: true })}
            className="grid h-11 place-items-center rounded-full border text-sm"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Hold up this card
          </Link>
          <Link href={profileUrl} className="grid h-11 place-items-center text-sm" style={{ color: theme.muted }}>
            Open public profile
          </Link>
        </div>
      </div>
    </main>
  );
}
