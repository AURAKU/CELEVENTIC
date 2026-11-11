"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  Globe,
  Handshake,
  Mail,
  MessageCircle,
  Phone,
  QrCode,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { celecardDockFinish, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import { digitalCardPublicUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { digitalCardPresentPath } from "@/lib/digital-business-card/share";
import { listDigitalCardReachItems } from "@/lib/digital-business-card/socials";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_NAME } from "@/lib/digital-business-card/product";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import { celeCardShareClipboard, celeCardShareMessage, celeCardShareTitle } from "@/lib/digital-business-card/share";
import { CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";
import { guestPrimaryActions } from "@/lib/celeyou-share/guest-actions";
import { guestIdentitySections } from "@/lib/celeyou-share/profile-sections";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";
import { shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { contactSaveHint } from "@/lib/celeyou-share/namedrop";
import { detectTapPlatform } from "@/lib/celeyou-proximity/capabilities";
import { readCelecardHoldViewport } from "@/lib/digital-business-card/hold-viewport";

export function DigitalCardPublicView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
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
  const copyInk = darkStage ? "rgba(250,246,239,0.88)" : "rgba(28,25,23,0.8)";
  const faintInk = darkStage ? "rgba(250,246,239,0.42)" : "rgba(28,25,23,0.42)";
  const scanUrl = celeYouCameraScanUrl(card.publicToken, origin);
  const profileUrl = digitalCardPublicUrl(card.slug, origin);
  const qrSrc = scanUrl ? digitalCardQrImageSrc(scanUrl) : "";
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hold, setHold] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    note: "",
    website: "",
  });

  const reach = useMemo(
    () => (Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card)),
    [card]
  );
  const primaryActions = useMemo(() => guestPrimaryActions(card), [card]);
  const contactActions = primaryActions.filter((action) => action.href);
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
      setSaveHint(contactSaveHint(detectTapPlatform()));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2200);
    } catch {
      setSaveState("idle");
    }
  }, [card, origin, saveState]);

  const shareCard = useCallback(async () => {
    trackCeleYouGuestEvent(card.slug, "share_tap");
    const shareUrl = profileUrl || scanUrl;
    const result = await shareCeleYouProfile({
      title: celeCardShareTitle(card),
      text: celeCardShareMessage(card),
      url: shareUrl,
    });
    if (result === "copied" || result === "unavailable") {
      if (result === "unavailable") {
        await navigator.clipboard.writeText(celeCardShareClipboard(card, shareUrl)).catch(() => undefined);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [card, profileUrl, scanUrl]);

  const submitConnect = useCallback(async () => {
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
          note: form.note || null,
          website: form.website || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setConnectError(data.error || "Could not connect");
        return;
      }
      setConnectDone(true);
      setConnectOpen(false);
    } catch {
      setConnectError("Network error. Try again.");
    } finally {
      setConnecting(false);
    }
  }, [card.slug, form]);

  useEffect(() => {
    if (!connectOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConnectOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [connectOpen]);

  useEffect(() => {
    const apply = () => {
      const next = readCelecardHoldViewport();
      setHold(next);
      if (next) setConnectOpen(false);
    };
    apply();
    const landscape = window.matchMedia("(orientation: landscape)");
    const coarse = window.matchMedia("(pointer: coarse)");
    landscape.addEventListener("change", apply);
    coarse.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    return () => {
      landscape.removeEventListener("change", apply);
      coarse.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    if (!hold) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [hold]);

  if (!card.isLive) {
    if (card.presentationMode === "courtesy") {
      return <DigitalCardContinuityView card={card} />;
    }
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  return (
    <main
      className={`celecard-stage relative min-h-app-viewport overflow-hidden ${hold ? "pb-0" : "pb-40"}`}
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      data-celecard-hold={hold ? "true" : undefined}
      style={{
        background: theme.stageBackground,
        ["--celecard-accent" as string]: theme.accent,
      }}
    >
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <div className="celecard-guest-column">
        <div className="celecard-hold-frame celecard-enter celecard-d2">
          <DigitalCardFace
            themeId={card.themeId}
            displayName={card.displayName}
            title={card.title}
            company={card.company}
            avatarUrl={card.avatarUrl}
            qrSrc={qrSrc}
            qrHref={hold ? undefined : digitalCardPublicUrl(card.slug)}
            portraitFrame={card.socials.portraitFrame}
            companyLogo
            companyLogoUrl={card.socials.companyLogoUrl}
            design={card.socials.design}
          />
        </div>

        <div className="celecard-guest-rest">
        <header className="celecard-guest-intro relative z-10">
          <p
            className="text-sm leading-relaxed"
            style={{ color: copyInk, fontFamily: typeVoice.meta }}
          >
            Save this contact. You do not need an app or an account.
          </p>
          {saveHint ? (
            <p className="text-xs leading-relaxed" style={{ color: faintInk, fontFamily: typeVoice.meta }}>
              {saveHint}
            </p>
          ) : null}
          <nav className="celecard-guest-links" aria-label="Card actions">
            <Link
              href={digitalCardPresentPath(card.slug, { immersive: true })}
              className="inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: theme.accent }}
            >
              Present card
            </Link>
            <button
              type="button"
              onClick={() => setShowQr((value) => !value)}
              className="inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: theme.accent }}
            >
              <QrCode className="h-3.5 w-3.5" />
              {showQr ? "Hide QR" : "Show QR"}
            </button>
          </nav>
        </header>

        {sections.length ? (
          <div className="celecard-enter celecard-d3 flex flex-col gap-6">
            {sections.map((section) => (
              <section key={section.id} className="celecard-guest-section">
                <h2
                  className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: theme.accent, fontFamily: typeVoice.meta }}
                >
                  {section.label}
                </h2>
                {section.body ? (
                  <p
                    className="text-center text-[15px] font-medium leading-relaxed"
                    style={{ color: copyInk, fontFamily: typeVoice.meta }}
                  >
                    {section.body}
                  </p>
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
            ))}
          </div>
        ) : null}

        {showQr ? (
          <div className="celecard-enter flex flex-col items-center gap-2">
            <CeleCardQrBadge
              qrSrc={qrSrc}
              href={digitalCardPublicUrl(card.slug)}
              theme={theme}
              avatarUrl={card.avatarUrl}
              displayName={card.displayName}
              sizeClass="h-60 w-60"
              padClass="p-0"
            />
            <p className="max-w-full break-all text-center text-[11px]" style={{ color: faintInk }}>
              {scanUrl}
            </p>
          </div>
        ) : null}

        {connectDone ? (
          <div className="celecard-enter rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
            <Check className="mx-auto h-6 w-6 text-emerald-600" aria-hidden />
            <p className="mt-2 font-display text-lg font-semibold text-emerald-900">You&apos;re connected</p>
            <p className="mt-1 text-sm text-emerald-800">
              {card.displayName} now has your contact too.
            </p>
          </div>
        ) : null}

        <Link
          href="/digital-cards"
          className="celecard-guest-brand celecard-enter celecard-d6 mx-auto mb-6 mt-2 flex w-fit flex-col items-center gap-3 pt-4"
          aria-label={`${SMARTCARD_PRODUCT_NAME}. Create your CeleYou`}
        >
          <span className="flex items-center gap-2" aria-hidden>
            <span
              className="h-px w-10"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.accent})` }}
            />
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: theme.accent }} />
            <span
              className="h-px w-10"
              style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
            />
          </span>
          <span className="inline-flex items-center gap-3">
            <CeleYouMarkIcon className="celecard-guest-mark overflow-visible" />
            <span className="flex flex-col items-start leading-none">
              <span
                className="font-display text-[1.65rem] font-bold tracking-[-0.04em] sm:text-[1.85rem]"
                style={{
                  color: darkStage ? "#f4e6c8" : theme.text,
                }}
              >
                <span>Cele</span>
                <span style={{ color: theme.accent }}>You</span>
                <sup className="ml-[0.12em] text-[0.55em] font-semibold" style={{ color: darkStage ? "rgba(244,230,200,0.55)" : theme.muted }}>
                  ®
                </sup>
              </span>
              <span
                className="mt-2 text-[11px] font-semibold tracking-[0.12em] sm:text-xs"
                style={{ color: theme.accent }}
              >
                {SMARTCARD_BRAND_TAGLINE}
              </span>
              <span
                className="mt-1 text-[10px] font-medium tracking-[0.08em] sm:text-[11px]"
                style={{ color: darkStage ? "rgba(244,230,200,0.7)" : theme.muted }}
              >
                Create your CeleYou
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2" aria-hidden>
            <span
              className="h-px w-10"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.accent})` }}
            />
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: theme.accent }} />
            <span
              className="h-px w-10"
              style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
            />
          </span>
        </Link>
        <div className="h-8 shrink-0" aria-hidden />
        </div>
      </div>

      <div
        className="celecard-dock-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:px-8 sm:pt-10"
        style={{ background: dock.veil }}
      >
        <div className="celecard-dock-stage">
        {contactActions.length ? (
          <div className="celecard-dock-row pointer-events-auto mx-auto mb-2 flex w-full gap-2 overflow-x-auto px-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
            {contactActions.map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="celecard-dock-item inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  backgroundColor: dock.ghostBg,
                  color: dock.ghostFg,
                  fontFamily: dock.font,
                }}
                onClick={() => trackCeleYouGuestEvent(card.slug, action.event)}
              >
                {action.id === "call" ? <Phone className="h-3.5 w-3.5" /> : null}
                {action.id === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : null}
                {action.id === "email" ? <Mail className="h-3.5 w-3.5" /> : null}
                {action.id === "website" ? <Globe className="h-3.5 w-3.5" /> : null}
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
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
            aria-label="Save all details to contacts on this device"
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
              {saveState === "saved" ? <Check /> : <Download />}
            </span>
            <span className="celecard-action-label">{saveState === "saved" ? "Saved" : "Save"}</span>
          </button>
          {card.connectBackEnabled && !card.isDemo && !connectDone ? (
            <button
              type="button"
              data-kind="ghost"
              className="celecard-action"
              style={{
                backgroundColor: dock.ghostBg,
                color: dock.ghostFg,
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
              <span className="celecard-action-label">Connect</span>
            </button>
          ) : null}
          <button
            type="button"
            data-kind="ghost"
            className="celecard-action"
            style={{
              backgroundColor: dock.ghostBg,
              color: dock.ghostFg,
              fontFamily: dock.font,
              letterSpacing: dock.tracking,
              textTransform: dock.labelTransform,
              borderRadius: dock.actionRadius,
            }}
            onClick={shareCard}
          >
            <span className="celecard-action-mark" aria-hidden>
              <Share2 />
            </span>
            <span className="celecard-action-label">{copied ? "Copied" : "Share"}</span>
          </button>
        </div>
        </div>
      </div>

      {card.connectBackEnabled && !card.isDemo && connectOpen && !connectDone ? (
        <div className="celecard-connect-layer fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center" role="dialog" aria-modal aria-labelledby="celecard-connect-title">
          <button type="button" className="absolute inset-0" aria-label="Close connect" onClick={() => setConnectOpen(false)} />
          <form
            className="celecard-sheet relative z-10 mb-[max(4.5rem,env(safe-area-inset-bottom))] w-full max-w-md space-y-3 rounded-[1.6rem] border p-4 shadow-2xl sm:mb-0"
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
              Connect Back
            </p>
            <p className="text-xs font-medium" style={{ color: copyInk, fontFamily: typeVoice.meta }}>
              Share your details with consent. No Celeventic account required.
            </p>
            <input
              required
              name="visitorName"
              placeholder="Your name"
              value={form.visitorName}
              onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: theme.border, background: darkStage ? "rgba(255,255,255,0.06)" : "#fff", color: "inherit" }}
            />
            <input
              type="email"
              name="visitorEmail"
              placeholder="Email"
              value={form.visitorEmail}
              onChange={(e) => setForm((f) => ({ ...f, visitorEmail: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: theme.border, background: darkStage ? "rgba(255,255,255,0.06)" : "#fff", color: "inherit" }}
            />
            <input
              name="visitorPhone"
              placeholder="Phone / WhatsApp"
              value={form.visitorPhone}
              onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: theme.border, background: darkStage ? "rgba(255,255,255,0.06)" : "#fff", color: "inherit" }}
            />
            <textarea
              name="note"
              placeholder="How we met (optional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="min-h-[72px] w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: theme.border, background: darkStage ? "rgba(255,255,255,0.06)" : "#fff", color: "inherit" }}
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
              name="website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
            {connectError ? <p className="text-xs text-rose-600">{connectError}</p> : null}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={connecting}
                style={{ background: dock.saveBg, color: dock.saveFg }}
                className="border-0 hover:brightness-110"
              >
                {connecting ? "Connecting…" : "Send contact"}
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
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
