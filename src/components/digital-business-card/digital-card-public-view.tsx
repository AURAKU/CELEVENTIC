"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Contact,
  Handshake,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { celecardAccentOnStage, celecardDockFinish, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import { digitalCardIdentityUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { digitalCardOgImagePath } from "@/lib/digital-business-card/share";
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
import { CONNECT_BACK_ARIA, CONNECT_BACK_CTA } from "@/lib/celeyou-share/guest-actions";
import {
  DigitalCardConnectExchange,
  useCeleYouExchangeAvailable,
} from "@/components/digital-business-card/digital-card-connect-exchange";
import { guestIdentitySections } from "@/lib/celeyou-share/profile-sections";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";
import { SAVE_CONTACT_CTA, shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { contactSaveHint } from "@/lib/celeyou-share/namedrop";
import { detectTapPlatform } from "@/lib/celeyou-proximity/capabilities";
import {
  celecardEventIsPlateBackground,
  celecardHoldIntentAfterAutoChange,
  celecardHoldIsActive,
  celecardRunHoldMotion,
  celecardToggleHoldIntent,
  readCelecardHoldAxis,
  readCelecardHoldViewport,
  type CeleCardHoldAxis,
  type CeleCardHoldIntent,
} from "@/lib/digital-business-card/hold-viewport";

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
  const copyInk = darkStage ? "rgba(250,246,239,0.92)" : "rgba(28,25,23,0.88)";
  const faintInk = darkStage ? "rgba(250,246,239,0.72)" : "rgba(28,25,23,0.62)";
  const headingInk = celecardAccentOnStage(theme.accent, darkStage);
  const scanUrl = celeYouCameraScanUrl(card.publicToken, origin);
  const profileUrl = digitalCardIdentityUrl(card.slug, origin);
  const qrSrc = scanUrl ? digitalCardQrImageSrc(scanUrl) : "";
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [holdIntent, setHoldIntent] = useState<CeleCardHoldIntent>("auto");
  const [autoHold, setAutoHold] = useState(false);
  const [holdAxis, setHoldAxis] = useState<CeleCardHoldAxis>("portrait");
  const [holdReady, setHoldReady] = useState(false);
  const holdIntentRef = useRef(holdIntent);
  holdIntentRef.current = holdIntent;
  const autoHoldRef = useRef(autoHold);
  autoHoldRef.current = autoHold;
  const hold = celecardHoldIsActive(holdIntent, autoHold);
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    visitorCompany: "",
    visitorTitle: "",
    note: "",
    website: "",
    consent: false,
    followupConsent: false,
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
      setSaveHint(contactSaveHint(detectTapPlatform()));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2200);
    } catch {
      setSaveState("idle");
    }
  }, [card, origin, saveState]);

  const shareCard = useCallback(async () => {
    const shareUrl = profileUrl || scanUrl;
    const result = await shareCeleYouProfile({
      title: celeCardShareTitle(card),
      text: celeCardShareMessage(card, shareUrl),
      url: shareUrl,
      imageUrl: digitalCardOgImagePath(card.slug, card.id),
    });
    if (result === "cancelled") return;
    if (result === "shared" || result === "copied" || result === "unavailable") {
      trackCeleYouGuestEvent(card.slug, "share_tap");
    }
    if (result === "copied" || result === "unavailable") {
      if (result === "unavailable") {
        await navigator.clipboard.writeText(celeCardShareClipboard(card, shareUrl)).catch(() => undefined);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [card, profileUrl, scanUrl]);

  const submitConnect = useCallback(async () => {
    if (!form.consent) {
      setConnectError("Consent is required");
      return;
    }
    if (!form.visitorEmail.trim() && !form.visitorPhone.trim()) {
      setConnectError("Email or phone is required");
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
          followupConsent: form.followupConsent,
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
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (connectOpen) {
        setConnectOpen(false);
        return;
      }
      if (celecardHoldIsActive(holdIntentRef.current, autoHoldRef.current)) {
        celecardRunHoldMotion(() => setHoldIntent("closed"));
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [connectOpen]);

  const toggleHold = useCallback(() => {
    const next = celecardToggleHoldIntent(celecardHoldIsActive(holdIntentRef.current, autoHoldRef.current));
    celecardRunHoldMotion(() => {
      setHoldIntent(next);
      if (next === "open") setConnectOpen(false);
    });
  }, []);

  const onPlateActivate = useCallback(
    (event: { target: EventTarget | null; preventDefault?: () => void }) => {
      if (!celecardEventIsPlateBackground(event.target)) return;
      event.preventDefault?.();
      toggleHold();
    },
    [toggleHold]
  );

  useEffect(() => {
    const apply = () => {
      const nextAuto = readCelecardHoldViewport();
      const nextIntent = celecardHoldIntentAfterAutoChange(holdIntentRef.current, nextAuto, autoHoldRef.current);
      if (nextIntent !== holdIntentRef.current) setHoldIntent(nextIntent);
      setAutoHold(nextAuto);
      setHoldAxis(readCelecardHoldAxis());
      setHoldReady(true);
      if (celecardHoldIsActive(nextIntent, nextAuto)) setConnectOpen(false);
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
      className={`celecard-stage relative min-h-app-viewport overflow-hidden ${hold ? "pb-0" : ""}`}
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      data-celecard-hold={holdReady ? (hold ? "true" : "false") : undefined}
      data-celecard-hold-axis={hold ? holdAxis : undefined}
      style={{
        background: theme.stageBackground,
        ["--celecard-accent" as string]: theme.accent,
      }}
    >
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <div className="celecard-guest-column">
        <div
          className="celecard-hold-frame celecard-enter celecard-d2"
          role="button"
          tabIndex={0}
          aria-pressed={hold}
          aria-label={
            hold
              ? "Show the full CeleYou. The QR stays ready to scan."
              : "Hold this card up. The plate fills the screen."
          }
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
            />
          </div>
        </div>

        <div className="celecard-guest-rest">
        <header className="celecard-guest-intro relative z-10">
          {saveHint ? (
            <p className="text-xs leading-relaxed" style={{ color: faintInk, fontFamily: typeVoice.meta }}>
              {saveHint}
            </p>
          ) : null}
        </header>

        {sections.length ? (
          <div className="celecard-enter celecard-d3 flex flex-col gap-6">
            {sections.map((section) => (
              <section key={section.id} className="celecard-guest-section">
                <h2
                  className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: headingInk, fontFamily: typeVoice.meta }}
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

        {connectDone ? (
          <div className="celecard-enter rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
            <Check className="mx-auto h-6 w-6 text-emerald-600" aria-hidden />
            <p className="mt-2 font-display text-lg font-semibold text-emerald-900">You&apos;re connected</p>
            <p className="mt-1 text-sm text-emerald-800">
              {card.displayName} now has your contact too.
            </p>
          </div>
        ) : null}
        </div>
      </div>

      <footer className="celecard-guest-footer" data-tone={darkStage ? "dark" : "light"}>
        <Link
          href="/digital-cards"
          className="celecard-guest-brand"
          aria-label={`${SMARTCARD_PRODUCT_NAME}. Create your CeleYou`}
        >
          <CeleYouMarkIcon className="celecard-guest-mark overflow-visible" />
          <span className="celecard-guest-brand-copy">
            <span className="celecard-guest-brand-name">
              <span>Cele</span>
              <span className="celecard-guest-brand-you">You</span>
              <sup>®</sup>
            </span>
            <span className="celecard-guest-brand-tag">{SMARTCARD_BRAND_TAGLINE}</span>
            <span className="celecard-guest-brand-cta">Create your CeleYou</span>
          </span>
        </Link>
      </footer>

      <div
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
            aria-label="Save filled details to contacts on this device"
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
                {saveState === "saved" ? "Saved" : SAVE_CONTACT_CTA}
              </span>
            </span>
          </button>
          {card.connectBackEnabled && !card.isDemo && !connectDone && !exchangeAvailable ? (
            <button
              type="button"
              data-kind="ghost"
              aria-label={CONNECT_BACK_ARIA}
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
                <span className="celecard-action-label">{CONNECT_BACK_CTA}</span>
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
            <input
              name="visitorCompany"
              placeholder="Company (optional)"
              value={form.visitorCompany}
              onChange={(e) => setForm((f) => ({ ...f, visitorCompany: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: theme.border, background: darkStage ? "rgba(255,255,255,0.06)" : "#fff", color: "inherit" }}
            />
            <input
              name="visitorTitle"
              placeholder="Job title (optional)"
              value={form.visitorTitle}
              onChange={(e) => setForm((f) => ({ ...f, visitorTitle: e.target.value }))}
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
            <label className="flex items-start gap-2 text-xs" style={{ color: copyInk }}>
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                className="mt-0.5"
              />
              <span>I agree to share these details with {card.displayName} through CeleYou.</span>
            </label>
            <label className="flex items-start gap-2 text-xs" style={{ color: copyInk }}>
              <input
                type="checkbox"
                checked={form.followupConsent}
                onChange={(e) => setForm((f) => ({ ...f, followupConsent: e.target.checked }))}
                className="mt-0.5"
              />
              <span>Send me a short thank you from {card.displayName} (optional).</span>
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
