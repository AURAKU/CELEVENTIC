"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  Contact,
  Handshake,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { CeleCardStageField, DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { CELECARD_REACH_INK, celecardAccentOnStage, celecardDockFinish, celecardKickerInk, celecardReachPlate, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import { digitalCardIdentityUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { listDigitalCardReachItems } from "@/lib/digital-business-card/socials";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";
import { SMARTCARD_BRAND_TAGLINE } from "@/lib/digital-business-card/product";
import { demoCardPreviewExplorePath } from "@/lib/digital-business-card/demo-card";
import { COMPANY_NAME } from "@/lib/constants";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import {
  celeCardShareCommentary,
  celeCardShareImageUrls,
  celeCardShareMessage,
  celeCardShareTitle,
} from "@/lib/digital-business-card/share";
import { CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  DigitalCardConnectExchange,
  useCeleYouExchangeAvailable,
} from "@/components/digital-business-card/digital-card-connect-exchange";
import { formatGuestAbout, guestIdentitySections } from "@/lib/celeyou-share/profile-sections";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";
import { copyCeleYouProfile, shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { contactSaveHintKey } from "@/lib/celeyou-share/namedrop";
import { detectTapPlatform } from "@/lib/celeyou-proximity/capabilities";
import { useCelecardSilentHold } from "@/components/digital-business-card/use-celecard-silent-hold";
import { celecardHoldPresent } from "@/lib/digital-business-card/hold-viewport";

function GuestLayer({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function DigitalCardPublicView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
  const { t } = useLocale();
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), card.socials.design);
  const motionMood = celecardMotionMood(theme, card.socials.design?.motion);
  const typeVoice = celecardTypeVoice(theme, card.socials.design?.lettering);
  const stageHex = theme.stageBackground.match(/#([0-9a-fA-F]{6})/)?.[1] ?? "1a1410";
  const stageLum =
    (parseInt(stageHex.slice(0, 2), 16) * 299 +
      parseInt(stageHex.slice(2, 4), 16) * 587 +
      parseInt(stageHex.slice(4, 6), 16) * 114) /
    1000;
  const darkStage = stageLum < 140;
  const dock = celecardDockFinish(theme, { darkStage, stageHex }, card.socials.design?.lettering);
  const copyInk = darkStage ? "rgba(250,246,239,0.94)" : "rgba(28,25,23,0.92)";
  const faintInk = darkStage ? "rgba(250,246,239,0.88)" : "rgba(28,25,23,0.82)";
  const headingInk = celecardAccentOnStage(theme.accent, darkStage);
  const kickerInk = celecardKickerInk(theme.accent, darkStage);
  const scanUrl = celeYouCameraScanUrl(card.publicToken, origin);
  const profileUrl = digitalCardIdentityUrl(card.slug, origin);
  const qrSrc = scanUrl ? digitalCardQrImageSrc(scanUrl) : "";
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { hold, holdAxis, setHoldIntent, onPlateActivate } = useCelecardSilentHold();
  const holdPresent = celecardHoldPresent(hold, holdAxis);
  const dockRef = useRef<HTMLDivElement>(null);
  const holdCloseRef = useRef<HTMLButtonElement>(null);
  const holdFrameRef = useRef<HTMLDivElement>(null);
  const sheetOpen = shareOpen || connectOpen;
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    visitorCompany: "",
    visitorTitle: "",
    note: "",
    website: "",
    consent: false,
  });
  const exchangeAvailable = useCeleYouExchangeAvailable(card.slug, card.isDemo);

  const reach = useMemo(
    () => (Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card)),
    [card]
  );
  const sections = useMemo(() => guestIdentitySections(card, reach), [card, reach]);

  const downloadVCard = useCallback(async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      const result = await saveDigitalCardContact(card, { origin, source: "guest" });
      if (result === "cancelled") {
        setSaveState("idle");
        return;
      }
      if (result !== "opened") trackCeleYouGuestEvent(card.slug, "vcard_save");
      setSaveHint(t(contactSaveHintKey(detectTapPlatform())));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2200);
      window.setTimeout(() => setSaveHint(null), 5200);
    } catch {
      setSaveState("idle");
    }
  }, [card, origin, saveState, t]);

  const plateShareUrls = useMemo(() => celeCardShareImageUrls(card.slug, card.id), [card.slug, card.id]);
  const shareCommentary = celeCardShareCommentary(card);

  const shareCard = useCallback(async () => {
    const shareUrl = profileUrl || scanUrl;
    setSharing(true);
    const result = await shareCeleYouProfile({
      title: celeCardShareTitle(card),
      text: celeCardShareMessage(card, shareUrl),
      url: shareUrl,
      imageUrl: plateShareUrls,
      persistPlateCardId: card.id || null,
      capturePlate: true,
    });
    setSharing(false);
    if (result === "cancelled") return;
    if (result === "shared" || result === "copied" || result === "unavailable") {
      trackCeleYouGuestEvent(card.slug, "share_tap");
      setShareOpen(false);
    }
    if (result === "copied" || result === "unavailable") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [card, plateShareUrls, profileUrl, scanUrl]);

  const copyCard = useCallback(async () => {
    const shareUrl = profileUrl || scanUrl;
    setCopying(true);
    const result = await copyCeleYouProfile({
      title: celeCardShareTitle(card),
      text: celeCardShareMessage(card, shareUrl),
      url: shareUrl,
      imageUrl: plateShareUrls,
      persistPlateCardId: card.id || null,
      capturePlate: true,
    });
    setCopying(false);
    if (result === "copied") {
      trackCeleYouGuestEvent(card.slug, "share_tap");
      setShareOpen(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [card, plateShareUrls, profileUrl, scanUrl]);

  const submitConnect = useCallback(async () => {
    if (connecting) return;
    if (!form.consent) {
      setConnectError(t("celeyou.consent_required"));
      return;
    }
    if (!form.visitorEmail.trim() && !form.visitorPhone.trim()) {
      setConnectError(t("celeyou.contact_required"));
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/digital-business-cards/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: card.slug,
          visitorName: form.visitorName,
          visitorEmail: form.visitorEmail || null,
          visitorPhone: form.visitorPhone || null,
          visitorCompany: form.visitorCompany || null,
          visitorTitle: form.visitorTitle || null,
          note: form.note || null,
          website: form.website || null,
          consent: true,
          followupConsent: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setConnectError(data.error || t("celeyou.connect_failed"));
        return;
      }
      setConnectDone(true);
      setConnectOpen(false);
    } catch {
      setConnectError(t("celeyou.network_error"));
    } finally {
      setConnecting(false);
    }
  }, [card.slug, connecting, form, t]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (shareOpen) {
        setShareOpen(false);
        return;
      }
      if (connectOpen) {
        setConnectOpen(false);
        return;
      }
      if (hold) setHoldIntent("closed");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [connectOpen, hold, setHoldIntent, shareOpen]);

  useEffect(() => {
    if (hold) {
      setConnectOpen(false);
      setShareOpen(false);
      window.setTimeout(() => holdCloseRef.current?.focus(), 20);
    } else {
      holdFrameRef.current?.focus();
    }
  }, [hold]);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const stage = el.closest(".celecard-stage") as HTMLElement | null;
    const apply = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      stage?.style.setProperty("--celecard-dock-h", `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.visualViewport?.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", apply);
    };
  }, [hold, connectDone, exchangeAvailable]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (sheetOpen) document.body.dataset.celecardSheet = "true";
    else delete document.body.dataset.celecardSheet;
    const html = document.documentElement;
    const prev = html.style.overflow;
    if (sheetOpen) html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      delete document.body.dataset.celecardSheet;
    };
  }, [sheetOpen]);

  if (!card.isLive) {
    if (card.presentationMode === "courtesy") {
      return <DigitalCardContinuityView card={card} />;
    }
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  return (
    <main
      className={`celecard-stage relative min-h-app-viewport overflow-hidden ${hold ? "pb-0" : ""}`}
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      data-celecard-stage={darkStage ? "dark" : "light"}
      data-celecard-hold={hold ? "true" : "false"}
      data-celecard-hold-axis={hold ? holdAxis : undefined}
      data-celecard-hold-present={holdPresent ?? undefined}
      data-celecard-sheet={sheetOpen ? "true" : undefined}
      role={hold ? "dialog" : undefined}
      aria-modal={hold ? true : undefined}
      aria-label={hold ? t("celeyou.fullscreen_card") : undefined}
      style={{
        background: theme.stageBackground,
        ["--celecard-accent" as string]: theme.accent,
        ["--celecard-stage-light" as string]: darkStage ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.78)",
        ["--celecard-stage-shade" as string]: darkStage ? "rgba(0,0,0,0.46)" : "rgba(15,23,42,0.12)",
      }}
    >
      <CeleCardStageField />
      <div className="celecard-atmo pointer-events-none absolute inset-0" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <div className="celecard-guest-column">
        <h1 className="sr-only">{card.displayName}</h1>
        <div
          ref={holdFrameRef}
          className="celecard-hold-frame celecard-enter celecard-d2"
          role="button"
          tabIndex={0}
          aria-pressed={hold}
          aria-label={hold ? t("celeyou.show_page") : t("celeyou.hold_qr")}
          onClick={onPlateActivate}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onPlateActivate(event);
            }
          }}
        >
          <div className="celecard-plate-motion">
            <DigitalCardFace
              themeId={card.themeId}
              displayName={card.displayName}
              title={card.title}
              company={card.company}
              avatarUrl={card.avatarUrl}
              qrSrc={qrSrc}
              portraitFrame={card.socials.portraitFrame}
              companyLogo
              companyLogoUrl={card.socials.companyLogoUrl}
              design={card.socials.design}
              present={holdPresent === "scan" ? "scan" : "card"}
            />
          </div>
        </div>

        <div className="celecard-guest-rest">
        <header className="celecard-guest-intro relative z-10">
          <p className="sr-only">{card.displayName}{card.company ? ` · ${card.company}` : ""}</p>
        </header>

        {sections.length ? (
          <div className="celecard-enter celecard-d3 flex flex-col gap-6">
            {sections.map((section) => {
              const sectionTitle = t(`celeyou.section_${section.id}`);
              return (
              <section key={section.id} className="celecard-guest-section">
                <h2
                  className="celecard-guest-kicker"
                  data-voice={typeVoice.originStyle}
                  data-rule={typeVoice.rule}
                  data-section={section.id}
                  data-span={sectionTitle.length > 18 ? "wide" : "tight"}
                  style={{
                    color: kickerInk,
                    fontFamily: typeVoice.origin,
                    ["--kicker-accent" as string]: theme.accent,
                  }}
                >
                  <span className="celecard-guest-kicker-rule" aria-hidden />
                  <span className="celecard-guest-kicker-label">{sectionTitle}</span>
                  <span className="celecard-guest-kicker-rule" aria-hidden />
                </h2>
                {section.body ? (
                  <blockquote
                    className="celecard-guest-about"
                    data-voice={typeVoice.originStyle}
                    data-rule={typeVoice.rule}
                    style={{
                      ...celecardReachPlate(theme, darkStage),
                      ["--about-accent" as string]: theme.accent,
                      fontFamily: typeVoice.heading,
                    }}
                  >
                    <p className="celecard-guest-copy">{formatGuestAbout(section.body)}</p>
                  </blockquote>
                ) : null}
                {section.items.length ? (
                  <DigitalCardReachGrid
                    items={section.items}
                    theme={theme}
                    slug={card.slug}
                    ownerName={card.displayName}
                  />
                ) : null}
              </section>
            );
            })}
          </div>
        ) : null}

        {connectDone ? (
          <div className="celecard-enter rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
            <Check className="mx-auto h-6 w-6 text-emerald-600" aria-hidden />
            <p className="mt-2 font-display text-lg font-semibold text-emerald-900">{t("celeyou.connected")}</p>
            <p className="mt-1 text-sm text-emerald-800">
              {t("celeyou.connected_body", { name: card.displayName })}
            </p>
          </div>
        ) : null}
        </div>
      </div>

      <footer className="celecard-guest-footer" data-tone={darkStage ? "dark" : "light"}>
        <Link
          href={demoCardPreviewExplorePath()}
          className="celecard-guest-brand"
          aria-label={t("celeyou.create_aria")}
        >
          <CeleYouMarkIcon className="celecard-guest-mark overflow-visible" />
          <span className="celecard-guest-brand-copy">
            <span className="celecard-guest-brand-name">
              <span>Cele</span>
              <span className="celecard-guest-brand-you">You</span>
              <sup>®</sup>
            </span>
            <span className="celecard-guest-brand-tag">{SMARTCARD_BRAND_TAGLINE}</span>
            <span className="celecard-guest-brand-cta">{t("celeyou.create_yours")}</span>
          </span>
        </Link>
        <Link
          href="/"
          className="celecard-guest-powered"
          aria-label={t("celeyou.powered_aria", { name: COMPANY_NAME })}
          data-celecard-origin={dock.originStyle}
          data-foil={dock.foil ? "true" : "false"}
          style={{
            ["--celecard-powered-accent" as string]: headingInk,
            ["--celecard-powered-metal" as string]: theme.border,
            ["--celecard-powered-ink" as string]: dock.ghostFg,
            background:
              dock.originStyle === "neon"
                ? `linear-gradient(180deg, ${theme.accent}1f 0%, rgba(2,6,23,0.55) 100%)`
                : dock.ghostBg,
            color: dock.ghostFg,
            borderColor:
              dock.originStyle === "neon"
                ? `${theme.accent}88`
                : `color-mix(in srgb, ${theme.border} 55%, ${dock.ghostBorder})`,
            borderRadius: dock.actionRadius,
            fontFamily: dock.font,
            letterSpacing: dock.tracking,
            textTransform: dock.labelTransform,
            boxShadow:
              dock.originStyle === "neon"
                ? `0 0 18px ${theme.accent}40, inset 0 1px 0 ${theme.accent}55`
                : dock.foil
                  ? "inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 14px rgba(15,23,42,0.06)"
                  : "0 6px 14px rgba(15,23,42,0.05)",
          }}
        >
          <span className="celecard-guest-powered-lead">{t("celeyou.powered_by")}</span>
          <span className="celecard-guest-powered-rule" aria-hidden />
          <span className="celecard-guest-powered-mark">{COMPANY_NAME}</span>
        </Link>
      </footer>

      <button
        ref={holdCloseRef}
        type="button"
        className="celecard-hold-close"
        aria-label={t("celeyou.close_fullscreen")}
        onClick={(event) => {
          event.stopPropagation();
          setHoldIntent("closed");
        }}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {saveHint ? (
        <div className="celecard-save-toast" role="status">
          <p style={{ color: faintInk }}>{saveHint}</p>
          <button type="button" onClick={() => setSaveHint(null)} aria-label={t("celeyou.dismiss")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div
        ref={dockRef}
        className="celecard-dock-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:px-8 sm:pt-10"
        style={{ background: dock.veil }}
      >
        <div className="celecard-dock-stage">
        <div
          className="celecard-dock-tray pointer-events-auto"
          data-celecard-origin={dock.originStyle}
          style={{
            borderColor: dock.trayBorder,
            background: dock.trayBg,
            boxShadow: dock.trayShadow,
            borderRadius: dock.trayRadius,
          }}
        >
          {dock.foil ? <span className="celecard-dock-foil" aria-hidden /> : null}
          <button
            type="button"
            onClick={downloadVCard}
            data-kind="save"
            aria-label={t("celeyou.save_aria")}
            aria-busy={saveState === "saving"}
            className="celecard-action"
            style={{
              backgroundColor: dock.saveBg,
              color: dock.saveFg,
              fontFamily: dock.font,
              letterSpacing: dock.tracking,
              textTransform: dock.labelTransform,
              borderRadius: dock.actionRadius,
            }}
          >
            <span className="celecard-action-mark" aria-hidden>
              {saveState === "saved" ? <Check /> : <Contact />}
            </span>
            <span className="celecard-action-copy">
              <span className="celecard-action-label">
                {saveState === "saved" ? t("celeyou.file_ready") : t("celeyou.save_contact")}
              </span>
            </span>
          </button>
          {card.connectBackEnabled && !card.isDemo && !connectDone && !exchangeAvailable ? (
            <button
              type="button"
              data-kind="ghost"
              aria-label={t("celeyou.connect_back_aria")}
              className="celecard-action"
              style={{
                backgroundColor: dock.ghostBg,
                color: dock.ghostFg,
                borderColor: dock.ghostBorder,
                borderWidth: 1,
                borderStyle: "solid",
                fontFamily: dock.font,
                letterSpacing: dock.tracking,
                textTransform: dock.labelTransform,
                borderRadius: dock.actionRadius,
              }}
              onClick={() => setConnectOpen(true)}
            >
              <span className="celecard-action-mark" aria-hidden>
                <Handshake />
              </span>
              <span className="celecard-action-copy">
                <span className="celecard-action-label">{t("celeyou.connect_back")}</span>
              </span>
            </button>
          ) : null}
          <DigitalCardConnectExchange
            slug={card.slug}
            isDemo={card.isDemo}
            dock={{
              ghostBg: dock.ghostBg,
              ghostFg: dock.ghostFg,
              ghostBorder: dock.ghostBorder,
              saveBg: dock.saveBg,
              saveFg: dock.saveFg,
              font: dock.font,
              tracking: dock.tracking,
              labelTransform: dock.labelTransform,
              actionRadius: dock.actionRadius,
            }}
          />
          <button
            type="button"
            data-kind="ghost"
            className="celecard-action"
            aria-label={t("celeyou.share_aria")}
            style={{
              backgroundColor: dock.ghostBg,
              color: dock.ghostFg,
              borderColor: dock.ghostBorder,
              borderWidth: 1,
              borderStyle: "solid",
              fontFamily: dock.font,
              letterSpacing: dock.tracking,
              textTransform: dock.labelTransform,
              borderRadius: dock.actionRadius,
            }}
            onClick={() => setShareOpen(true)}
          >
            <span className="celecard-action-mark" aria-hidden>
              <Share2 />
            </span>
            <span className="celecard-action-label">{copied ? t("celeyou.copied") : t("celeyou.share")}</span>
          </button>
        </div>
        </div>
      </div>

      {shareOpen ? (
        <GuestLayer>
        <div
          className="celecard-share-layer celecard-guest-overlay fixed inset-0 z-[200] grid place-items-center bg-black/70 p-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal
          aria-labelledby="celecard-share-title"
        >
          <button type="button" className="absolute inset-0" aria-label={t("celeyou.close_share")} onClick={() => setShareOpen(false)} />
          <div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-[1.7rem] border p-4 shadow-2xl"
            style={{ background: "rgba(255,251,245,0.98)", borderColor: theme.border, color: "#1c1917" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id="celecard-share-title" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0B8A83]">
                  {t("celeyou.share_this")}
                </p>
                <p className="mt-1 text-[15px] font-semibold tracking-tight">{t("celeyou.live_card")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5"
                aria-label={t("celeyou.close_share")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="celecard-share-plate mt-3 overflow-hidden rounded-[1.15rem] border shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
              style={{ borderColor: "rgba(28,25,23,0.08)" }}
              aria-hidden
            >
              <DigitalCardFace
                themeId={card.themeId}
                displayName={card.displayName}
                title={card.title}
                company={card.company}
                avatarUrl={card.avatarUrl}
                qrSrc={qrSrc}
                portraitFrame={card.socials.portraitFrame}
                companyLogo
                companyLogoUrl={card.socials.companyLogoUrl}
                design={card.socials.design}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ fontFamily: typeVoice.meta }}>
              {shareCommentary}
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={sharing || copying}
                onClick={() => void shareCard()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white"
                style={{ background: "#0B8A83" }}
              >
                <Share2 className="h-4 w-4" />
                {sharing ? t("celeyou.preparing_card") : t("celeyou.share_card")}
              </button>
              <button
                type="button"
                disabled={sharing || copying}
                onClick={() => void copyCard()}
                className="inline-flex min-h-11 items-center justify-center rounded-full border text-sm font-semibold"
                style={{ borderColor: "rgba(28,25,23,0.14)", color: "#0B8A83" }}
              >
                {copying ? t("celeyou.copying") : t("celeyou.copy_link")}
              </button>
            </div>
          </div>
        </div>
        </GuestLayer>
      ) : null}

      {card.connectBackEnabled && !card.isDemo && connectOpen && !connectDone ? (
        <GuestLayer>
        <div className="celecard-connect-layer celecard-guest-overlay fixed inset-0 z-[200] grid place-items-center bg-black/70 p-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal aria-labelledby="celecard-connect-title">
          <button type="button" className="absolute inset-0" aria-label={t("celeyou.close_connect")} onClick={() => setConnectOpen(false)} />
          <form
            className="celecard-sheet relative z-10 w-full max-w-md space-y-3 rounded-[1.6rem] border p-4 shadow-2xl"
            style={{
              borderColor: theme.border,
              background: darkStage ? "rgba(16,18,24,0.96)" : "#fffbf5",
              color: darkStage ? "#f8f4ec" : "#1c1917",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              void submitConnect();
            }}
          >
            <p
              id="celecard-connect-title"
              className="text-base font-semibold"
              style={{ fontFamily: typeVoice.heading, color: darkStage ? "#f8f4ec" : "#1c1917" }}
            >
              {t("celeyou.connect_back")}
            </p>
            <p className="text-xs font-medium" style={{ color: copyInk, fontFamily: typeVoice.meta }}>
              {t("celeyou.connect_back_intro")}
            </p>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.your_name")} <span className="font-medium opacity-70">({t("celeyou.required")})</span></span>
            <input
              required
              name="visitorName"
              placeholder={t("celeyou.your_name")}
              autoComplete="name"
              value={form.visitorName}
              onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.email")} <span className="font-medium opacity-70">({t("celeyou.email_or_phone_needed")})</span></span>
            <input
              type="email"
              name="visitorEmail"
              placeholder={t("celeyou.email")}
              autoComplete="email"
              inputMode="email"
              value={form.visitorEmail}
              onChange={(e) => setForm((f) => ({ ...f, visitorEmail: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.connect_phone_placeholder")} <span className="font-medium opacity-70">({t("celeyou.email_or_phone_needed")})</span></span>
            <input
              type="tel"
              name="visitorPhone"
              placeholder={t("celeyou.connect_phone_placeholder")}
              autoComplete="tel"
              inputMode="tel"
              maxLength={120}
              value={form.visitorPhone}
              onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.company")} <span className="font-medium opacity-70">({t("celeyou.optional")})</span></span>
            <input
              name="visitorCompany"
              placeholder={t("celeyou.company_optional")}
              autoComplete="organization"
              value={form.visitorCompany}
              onChange={(e) => setForm((f) => ({ ...f, visitorCompany: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.job_title")} <span className="font-medium opacity-70">({t("celeyou.optional")})</span></span>
            <input
              name="visitorTitle"
              placeholder={t("celeyou.job_optional")}
              autoComplete="organization-title"
              value={form.visitorTitle}
              onChange={(e) => setForm((f) => ({ ...f, visitorTitle: e.target.value }))}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="grid gap-1 text-xs font-semibold" style={{ color: copyInk }}>
              <span>{t("celeyou.how_we_met_short")} <span className="font-medium opacity-70">({t("celeyou.optional")})</span></span>
            <textarea
              name="note"
              placeholder={t("celeyou.how_we_met")}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={`min-h-[72px] w-full rounded-xl border px-3 py-2.5 text-sm ${darkStage ? "placeholder:text-white/45" : "placeholder:text-stone-500"}`}
              style={{
                borderColor: darkStage ? "rgba(255,255,255,0.22)" : "rgba(28,25,23,0.16)",
                background: darkStage ? "rgba(255,255,255,0.10)" : "#fff",
                color: darkStage ? "#f8f4ec" : CELECARD_REACH_INK,
              }}
            />
            </label>
            <label className="flex items-start gap-2 text-xs" style={{ color: copyInk }}>
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                className="mt-0.5"
              />
              <span>{t("celeyou.consent", { name: card.displayName })}</span>
            </label>
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
              name="website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
            {connectError ? <p className="text-xs text-rose-600" role="alert">{connectError}</p> : null}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={connecting}
                style={{ background: dock.saveBg, color: dock.saveFg }}
                className="border-0 hover:brightness-110"
              >
                {connecting ? t("celeyou.connecting") : t("celeyou.send_contact")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConnectOpen(false)}
                style={{
                  borderColor: dock.ghostBorder,
                  color: dock.ghostFg,
                  background: dock.ghostBg,
                }}
              >
                {t("celeyou.cancel")}
              </Button>
            </div>
          </form>
        </div>
        </GuestLayer>
      ) : null}
    </main>
  );
}
