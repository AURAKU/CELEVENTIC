"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Contact, Handshake, Share2 } from "lucide-react";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import {
  DigitalCardConnectExchange,
  useCeleYouExchangeAvailable,
} from "@/components/digital-business-card/digital-card-connect-exchange";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import {
  digitalCardIdentityUrl,
  type DigitalCardPublicPayload,
} from "@/lib/digital-business-card/types";
import {
  celeCardShareCommentary,
  celeCardShareImageUrls,
  celeCardShareTitle,
} from "@/lib/digital-business-card/share";
import { shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";
import { contactSaveHintKey } from "@/lib/celeyou-share/namedrop";
import { detectTapPlatform } from "@/lib/celeyou-proximity/capabilities";
import { celeYouGuestLandingPath } from "@/lib/digital-business-card/product";
import { useLocale } from "@/components/i18n/locale-provider";

type Landing = {
  expiresAt: string;
  sessionStatus: string;
  connectBackEnabled: boolean;
  host: DigitalCardPublicPayload;
};

export function CeleYouTapGuestView({
  joinCode,
  origin,
  landing,
  error,
}: {
  joinCode: string;
  origin: string;
  landing: Landing | null;
  error?: string | null;
}) {
  const { t } = useLocale();
  const host = landing?.host ?? null;
  const profileUrl = host ? digitalCardIdentityUrl(host.slug, origin) : "";
  const exchangeAvailable = useCeleYouExchangeAvailable(host?.slug || "", host?.isDemo);
  const [formOpen, setFormOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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

  const [expiredClient, setExpiredClient] = useState(false);
  const expired = !host || expiredClient;

  useEffect(() => {
    if (!landing?.expiresAt) return;
    const tick = () => {
      if (Date.parse(landing.expiresAt) <= Date.now()) setExpiredClient(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [landing?.expiresAt]);
  const plateShareUrls = useMemo(
    () => (host ? celeCardShareImageUrls(host.slug, host.id) : []),
    [host]
  );

  const saveContact = useCallback(async () => {
    if (!host || saveState === "saving") return;
    setSaveState("saving");
    try {
      const result = await saveDigitalCardContact(host, { origin, source: "guest" });
      if (result === "cancelled") {
        setSaveState("idle");
        return;
      }
      if (result !== "opened") trackCeleYouGuestEvent(host.slug, "vcard_save");
      setSaveHint(t(contactSaveHintKey(detectTapPlatform())));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2200);
    } catch {
      setSaveState("idle");
    }
  }, [host, origin, saveState, t]);

  async function shareCard() {
    if (!host || !profileUrl) return;
    await shareCeleYouProfile({
      title: celeCardShareTitle({ displayName: host.displayName, title: host.title }),
      text: celeCardShareCommentary(host),
      url: profileUrl,
      imageUrl: plateShareUrls,
    });
    trackCeleYouGuestEvent(host.slug, "share_tap");
  }

  async function submit() {
    if (!host) return;
    if (form.visitorName.trim().length < 2) {
      setFormError(t("celeyou.enter_name"));
      return;
    }
    if (!form.visitorEmail.trim() && !form.visitorPhone.trim()) {
      setFormError(t("celeyou.add_email_or_phone"));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/digital-business-cards/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: host.slug,
          visitorName: form.visitorName,
          visitorEmail: form.visitorEmail || null,
          visitorPhone: form.visitorPhone || null,
          visitorCompany: form.visitorCompany || null,
          visitorTitle: form.visitorTitle || null,
          note: form.note || null,
          consent: form.consent,
          followupConsent: true,
          website: form.website,
          tapJoinCode: joinCode,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof json.error === "string" ? json.error : t("celeyou.send_contact_failed"));
        return;
      }
      setDone(true);
      setFormOpen(false);
    } catch {
      setFormError(t("celeyou.network_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="celecard-stage min-h-app-viewport overflow-x-hidden bg-[#062e2c] text-[#F4FFFD]">
      <div className="celecard-tap-guest relative mx-auto">
        <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_18%,rgba(11,138,131,0.45),transparent_52%)]" />
        <header className="celecard-tap-guest-bar relative z-10 flex items-center justify-between">
          <CeleYouBrandMark variant="chip" tone="dark" markClassName="h-7 w-7" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">CeleYou</p>
        </header>

        <div className="celecard-tap-heading relative z-10 mt-8 text-center">
          <h1 className="celeyou-page-title font-display font-semibold tracking-tight">{t("celeyou.tap_heading")}</h1>
          <p className="celecard-tap-lead mt-2 text-white/70">{t("celeyou.tap_support")}</p>
        </div>

        {expired ? (
          <div className="relative z-10 mt-10 space-y-4 text-center">
            <p className="text-lg font-semibold">{t("celeyou.tap_expired")}</p>
            <p className="text-sm text-white/65">
              {error || t("celeyou.tap_expired_body")}
            </p>
            <Link
              href={celeYouGuestLandingPath()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#0B8A83] px-5 text-sm font-semibold"
            >
              {t("celeyou.create_free")}
            </Link>
          </div>
        ) : (
          <>
            <div className="celecard-tap-identity relative z-10 mt-8 flex flex-col items-center text-center">
              {host.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={host.avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-[#7FF0E4]/40"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 text-2xl font-semibold">
                  {host.displayName.slice(0, 1)}
                </div>
              )}
              <p className="celecard-identity-copy mt-4 font-display text-2xl font-semibold">{host.displayName}</p>
              <p className="celecard-identity-copy mt-1 text-xs uppercase tracking-[0.16em] text-white/45">@{host.slug}</p>
              {host.title ? <p className="celecard-identity-copy mt-1 text-sm text-white/70">{host.title}</p> : null}
              {host.company ? <p className="celecard-identity-copy text-xs uppercase tracking-[0.16em] text-white/45">{host.company}</p> : null}
            </div>

            <div className="celecard-tap-body">

            {done ? (
              <div className="celecard-tap-receipt relative z-10 mt-8 space-y-3 rounded-[1.5rem] border border-[#7FF0E4]/30 bg-white/5 px-4 py-6 text-center">
                <Check className="mx-auto h-7 w-7 text-[#7FF0E4]" aria-hidden />
                <p className="font-display text-2xl font-semibold">{t("celeyou.connected")}</p>
                <p className="text-sm text-white/70">{t("celeyou.connected_body", { name: host.displayName })}</p>
              </div>
            ) : null}

            <p className="relative z-10 mt-4 text-center text-xs leading-relaxed text-white/50">{t("celeyou.save_lead")}</p>
            {saveHint ? <p className="relative z-10 mt-2 text-center text-xs text-white/55">{saveHint}</p> : null}

            <div className="celecard-tap-actions relative z-10 mt-8">
              <button
                type="button"
                onClick={() => void saveContact()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0B8A83] text-sm font-semibold"
              >
                <Contact className="h-4 w-4" aria-hidden />
                {saveState === "saved" ? t("celeyou.saved") : t("celeyou.save_contact")}
              </button>
              {exchangeAvailable ? (
                <DigitalCardConnectExchange
                  slug={host.slug}
                  isDemo={host.isDemo}
                  tapJoinCode={joinCode}
                  onExchanged={() => setDone(true)}
                  dock={{
                    ghostBg: "transparent",
                    ghostFg: "#F4FFFD",
                    ghostBorder: "rgba(255,255,255,0.15)",
                    saveBg: "#0B8A83",
                    saveFg: "#fff",
                    font: "inherit",
                    tracking: "0",
                    labelTransform: "none",
                    actionRadius: 999,
                  }}
                />
              ) : landing?.connectBackEnabled && !done ? (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-sm"
                >
                  <Handshake className="h-4 w-4" aria-hidden />
                  {t("celeyou.exchange_contact")}
                </button>
              ) : (
                <Link
                  href={`/auth/login?callbackUrl=${encodeURIComponent(`/tap/${joinCode}`)}`}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 text-sm"
                >
                  {t("celeyou.exchange_cards")}
                </Link>
              )}
              <Link
                href={profileUrl}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 text-sm"
              >
                {t("celeyou.view_full_card")}
              </Link>
              <button
                type="button"
                onClick={() => void shareCard()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-sm"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                {t("celeyou.share")}
              </button>
            </div>

            {!exchangeAvailable ? (
              <p className="relative z-10 mt-4 text-center text-xs text-white/50">
                {t("celeyou.have_celeyou")}{" "}
                <Link
                  href={`/auth/login?callbackUrl=${encodeURIComponent(`/tap/${joinCode}`)}`}
                  className="font-semibold text-[#7FF0E4]"
                >
                  {t("celeyou.sign_in_exchange")}
                </Link>
              </p>
            ) : null}

            {formOpen && !done ? (
              <form
                className="celecard-tap-form relative z-10 mt-6 space-y-3 rounded-[1.5rem] border border-white/15 bg-white/5 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <p className="text-base font-semibold">{t("celeyou.share_your_contact")}</p>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  name="visitorName"
                  placeholder={t("celeyou.your_name")}
                  aria-label={t("celeyou.your_name")}
                  value={form.visitorName}
                  onChange={(event) => setForm((current) => ({ ...current, visitorName: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none"
                />
                <input
                  type="email"
                  maxLength={200}
                  name="visitorEmail"
                  placeholder={t("celeyou.email")}
                  aria-label={t("celeyou.email")}
                  value={form.visitorEmail}
                  onChange={(event) => setForm((current) => ({ ...current, visitorEmail: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none"
                />
                <input
                  maxLength={120}
                  name="visitorPhone"
                  placeholder={t("celeyou.connect_phone_placeholder")}
                  aria-label={t("celeyou.connect_phone_placeholder")}
                  autoComplete="tel"
                  inputMode="text"
                  value={form.visitorPhone}
                  onChange={(event) => setForm((current) => ({ ...current, visitorPhone: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none placeholder:text-white/45"
                />
                <input
                  maxLength={160}
                  name="visitorCompany"
                  placeholder={t("celeyou.company")}
                  aria-label={t("celeyou.company")}
                  value={form.visitorCompany}
                  onChange={(event) => setForm((current) => ({ ...current, visitorCompany: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none"
                />
                <input
                  maxLength={120}
                  name="visitorTitle"
                  placeholder={t("celeyou.job_title")}
                  aria-label={t("celeyou.job_title")}
                  value={form.visitorTitle}
                  onChange={(event) => setForm((current) => ({ ...current, visitorTitle: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none"
                />
                <textarea
                  maxLength={500}
                  name="note"
                  placeholder={t("celeyou.how_we_met_short")}
                  aria-label={t("celeyou.how_we_met_short")}
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className="min-h-[72px] w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
                />
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="hidden"
                  name="website"
                  value={form.website}
                  onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                />
                <label className="flex items-start gap-2 text-xs leading-relaxed text-white/75">
                  <input
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>
                    {t("celeyou.tap_consent_lead")}{" "}
                    <Link href="/legal/privacy" className="font-semibold text-[#7FF0E4]">
                      {t("footer.privacy")}
                    </Link>
                    .
                  </span>
                </label>
                {formError ? <p className="text-xs text-amber-200">{formError}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-full bg-[#0B8A83] text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? t("celeyou.sending") : t("celeyou.send_my_contact")}
                </button>
              </form>
            ) : null}

            {done ? (
              <div className="relative z-10 mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void saveContact()}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#0B8A83] text-sm font-semibold"
                >
                  {t("celeyou.save_named_contact", { name: host.displayName.split(" ")[0] })}
                </button>
                <Link
                  href={profileUrl}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 text-sm"
                >
                  {t("celeyou.view_named_card", { name: host.displayName.split(" ")[0] })}
                </Link>
                <Link
                  href={celeYouGuestLandingPath()}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 text-sm"
                >
                  {t("celeyou.create_free")}
                </Link>
              </div>
            ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
