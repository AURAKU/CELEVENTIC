"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { digitalCardIdentityUrl, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import {
  groupDigitalCardPayItems,
  listDigitalCardPayItems,
} from "@/lib/digital-business-card/socials";
import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";
import {
  celecardPortraitFrameClass,
  resolveCeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";

function stageIsDark(stageBackground: string) {
  const match = stageBackground.match(/#([0-9a-fA-F]{6})/);
  if (!match) return true;
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function DigitalCardWalletView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), card.socials.design);
  const motionMood = celecardMotionMood(theme, card.socials.design?.motion);
  const typeVoice = celecardTypeVoice(theme, card.socials.design?.lettering);
  const profileUrl = digitalCardIdentityUrl(card.slug, origin);
  const families = useMemo(
    () => groupDigitalCardPayItems(listDigitalCardPayItems(card)),
    [card]
  );
  const frame = resolveCeleCardPortraitFrame(theme, card.socials.portraitFrame);
  const photo = isCeleCardPhotoUrl(card.avatarUrl);
  const roleLine = [card.title, card.company].filter(Boolean).join(" · ");
  const darkStage = stageIsDark(theme.stageBackground);
  const paper = theme.cardBackground || (darkStage ? "#fff8ef" : "#ffffff");

  if (card.presentationMode === "courtesy") {
    return <DigitalCardContinuityView card={card} />;
  }
  if (card.presentationMode && card.presentationMode !== "live") {
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  return (
    <main
      className="celecard-stage relative min-h-app-viewport overflow-x-hidden px-5 pb-16 pt-16 sm:pt-20"
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      style={{ background: theme.stageBackground }}
    >
      <div
        className="relative z-10 mx-auto isolate flex w-full max-w-md flex-col gap-5 rounded-[1.85rem] border px-5 py-6 shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
        style={{ background: paper, borderColor: theme.border, color: theme.text }}
      >
        <header className="flex items-center gap-3.5">
          {photo ? (
            <img
              src={card.avatarUrl ?? ""}
              alt=""
              className={cn("h-14 w-14 shrink-0 object-cover", celecardPortraitFrameClass(frame))}
            />
          ) : (
            <DigitalCardHouseAvatar
              theme={theme}
              avatarUrl={card.avatarUrl}
              className="h-14 w-14"
              framed={false}
              rounded={frame === "circle" ? "full" : frame === "rounded" ? "lg" : "none"}
            />
          )}
          <div className="min-w-0">
            <p
              className="truncate text-[1.15rem] font-semibold tracking-tight"
              style={{ color: theme.text, fontFamily: typeVoice.heading }}
            >
              {card.displayName}
            </p>
            {roleLine ? (
              <p className="mt-0.5 truncate text-sm" style={{ color: theme.muted, fontFamily: typeVoice.title }}>
                {roleLine}
              </p>
            ) : null}
          </div>
        </header>

        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: theme.text, fontFamily: typeVoice.heading }}
        >
          Payment channels
        </h1>

        {families.length ? (
          <div className="space-y-5" aria-label="Payment channels">
            {families.map((family) => (
              <section key={family.id} className="space-y-2.5" aria-labelledby={`pay-${family.id}`}>
                <h2
                  id={`pay-${family.id}`}
                  className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: theme.muted }}
                >
                  {family.label}
                </h2>
                <DigitalCardReachGrid
                  items={family.items}
                  theme={theme}
                  slug={card.slug}
                  ownerName={card.displayName}
                />
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
            No wallets or bank details are on this CeleYou yet.
          </p>
        )}

        <Link
          href={profileUrl}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap text-sm font-semibold"
          style={{ color: theme.accent }}
        >
          Open public profile
        </Link>
      </div>
    </main>
  );
}
