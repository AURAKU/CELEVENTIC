"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  QrCode,
  Share2,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { celecardDockFinish, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import { digitalCardPublicUrl, digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { digitalCardPresentPath } from "@/lib/digital-business-card/share";
import { listDigitalCardReachItems } from "@/lib/digital-business-card/socials";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";
import {
  SMARTCARD_BRAND_TAGLINE,
  SMARTCARD_PRODUCT_NAME,
  smartCardShortUrl,
} from "@/lib/digital-business-card/product";
import { CeleYouMarkIcon } from "@/components/digital-business-card/celeyou-brand-mark";

export function DigitalCardPublicView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
  const theme = resolveDigitalCardTheme(card.themeId);
  const motionMood = celecardMotionMood(theme);
  const typeVoice = celecardTypeVoice(theme);
  const stageHex = theme.stageBackground.match(/#([0-9a-fA-F]{6})/)?.[1] ?? "1a1410";
  const stageLum =
    (parseInt(stageHex.slice(0, 2), 16) * 299 +
      parseInt(stageHex.slice(2, 4), 16) * 587 +
      parseInt(stageHex.slice(4, 6), 16) * 114) /
    1000;
  const darkStage = stageLum < 140;
  const dock = celecardDockFinish(theme, { darkStage, stageHex });
  const copyInk = darkStage ? "rgba(250,246,239,0.88)" : "rgba(28,25,23,0.8)";
  const faintInk = darkStage ? "rgba(250,246,239,0.42)" : "rgba(28,25,23,0.42)";
  const shortUrl = smartCardShortUrl(card.publicToken, origin);
  const qrSrc = digitalCardQrImageSrc(shortUrl);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
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

  const downloadVCard = useCallback(() => {
    const blob = new Blob([buildVCard(card)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.slug}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [card]);

  const shareCard = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: card.displayName,
          text: `${card.displayName} · ${SMARTCARD_PRODUCT_NAME}`,
          url: shortUrl,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [card.displayName, shortUrl]);

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

  if (!card.isLive) {
    if (card.presentationMode === "courtesy") {
      return <DigitalCardContinuityView card={card} />;
    }
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  return (
    <main
      className="celecard-stage relative min-h-app-viewport overflow-hidden pb-32"
      data-celecard-mood={motionMood}
      style={{
        background: theme.stageBackground,
        ["--celecard-accent" as string]: theme.accent,
      }}
    >
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <div className="relative mx-auto flex w-full max-w-[44rem] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {card.isDemo ? (
          <p
            className="celecard-enter celecard-d1 mx-auto w-fit rounded-full px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm"
            style={{ background: theme.accentSoft, color: theme.accent }}
          >
            Demo tap. Same page a link, QR, or NFC opens.
          </p>
        ) : null}

        <div className="celecard-enter celecard-d2">
          <DigitalCardFace
            themeId={card.themeId}
            displayName={card.displayName}
            title={card.title}
            company={card.company}
            avatarUrl={card.avatarUrl}
            qrSrc={qrSrc}
            qrHref={digitalCardPublicUrl(card.slug)}
            portraitFrame={card.socials.portraitFrame}
          />
          <div className="relative z-10 mt-3 flex items-center justify-center gap-4">
            <Link
              href={digitalCardPresentPath(card.slug)}
              className="inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: theme.accent }}
            >
              Present card
            </Link>
          </div>
        </div>

        <div className="celecard-enter celecard-d3 text-center">
          {card.bio ? (
            <p
              className="mx-auto mt-2 max-w-sm text-[15px] font-medium leading-relaxed"
              style={{ color: copyInk, fontFamily: typeVoice.meta }}
            >
              {card.bio}
            </p>
          ) : null}
        </div>

        <div className="celecard-enter celecard-d4">
          <DigitalCardReachGrid items={reach} theme={theme} slug={card.isDemo ? undefined : card.slug} />
        </div>

        <div className="celecard-enter celecard-d5 mb-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowQr((value) => !value)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: theme.accent }}
          >
            <QrCode className="h-3.5 w-3.5" />
            {showQr ? "Hide QR" : "Show QR"}
          </button>
        </div>
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
              {shortUrl}
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
          className="celecard-enter celecard-d6 mx-auto mb-6 mt-2 flex w-fit flex-col items-center gap-2.5 pt-4"
          aria-label={`${SMARTCARD_PRODUCT_NAME}. See templates`}
        >
          <span className="flex items-center gap-2" aria-hidden>
            <span
              className="h-px w-8"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.accent})` }}
            />
            <span className="h-1 w-1 rotate-45" style={{ background: theme.accent }} />
            <span
              className="h-px w-8"
              style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
            />
          </span>
          <span className="inline-flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full shadow-[0_4px_14px_rgba(4,24,28,0.28)]"
              aria-hidden
            >
              <CeleYouMarkIcon className="h-8 w-8" />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span
                className="font-display text-[15px] font-bold tracking-[-0.035em]"
                style={{
                  color: darkStage ? "#f4e6c8" : theme.text,
                }}
              >
                <span>Cele</span>
                <span style={{ color: theme.accent }}>You</span>
              </span>
              <span
                className="mt-1 text-[8px] font-semibold tracking-[0.08em]"
                style={{ color: theme.accent }}
              >
                {SMARTCARD_BRAND_TAGLINE}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2" aria-hidden>
            <span
              className="h-px w-8"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.accent})` }}
            />
            <span className="h-1 w-1 rotate-45" style={{ background: theme.accent }} />
            <span
              className="h-px w-8"
              style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
            />
          </span>
        </Link>
        <div className="h-8 shrink-0" aria-hidden />
      </div>

      <div
        className="celecard-dock-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 sm:px-6 lg:px-8 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-10"
        style={{ background: dock.veil }}
      >
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
              <Download />
            </span>
            Save
          </button>
          {card.connectBackEnabled && !connectDone ? (
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
              Connect
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
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>

      {card.connectBackEnabled && connectOpen && !connectDone ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center" role="dialog" aria-modal aria-labelledby="celecard-connect-title">
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
