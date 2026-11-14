"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { useLocale } from "@/components/i18n/locale-provider";

function inkOnAccent(accent: string) {
  const hex = accent.replace("#", "");
  if (hex.length < 6) return "#1c1917";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum < 150 ? "#f8f4ec" : "#1c1917";
}

function ContinuityPanel({
  open,
  compact,
  accent,
  headingId,
  descriptionId,
  onClose,
  onRequest,
}: {
  open: boolean;
  compact: boolean;
  accent: string;
  headingId: string;
  descriptionId: string;
  onClose: () => void;
  onRequest: () => void;
}) {
  const { t } = useLocale();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 flex justify-center p-4 ${
        compact ? "items-end pb-[max(1rem,env(safe-area-inset-bottom))]" : "items-end sm:items-center"
      }`}
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-stone-950/20"
        aria-label={t("celeyou.dismiss")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className={`pointer-events-auto relative z-10 w-full max-w-md overflow-y-auto border border-white/40 bg-[#f7f1e8] text-stone-900 shadow-[0_24px_80px_rgba(20,14,8,0.28)] max-h-[min(92dvh,34rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-reduce:animate-none ${
          compact ? "rounded-t-3xl rounded-b-2xl p-5" : "rounded-3xl p-6 sm:motion-safe:zoom-in-95"
        }`}
      >
        <p id={headingId} className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight">
          {t("celeyou.courtesy_heading")}
        </p>
        <p id={descriptionId} className="mt-3 text-[0.95rem] leading-7 text-stone-600">
          {t("celeyou.courtesy_description")}
        </p>
        <div className={`mt-6 flex gap-2 ${compact ? "flex-col" : "flex-col sm:flex-row"}`}>
          <button
            ref={primaryRef}
            type="button"
            className="min-h-11 flex-1 rounded-xl px-5 text-sm font-semibold shadow-sm"
            style={{ background: accent, color: inkOnAccent(accent) }}
            onClick={onRequest}
          >
            {t("celeyou.courtesy_primary")}
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl border border-stone-300/80 bg-white/70 px-5 text-sm font-semibold text-stone-700"
            onClick={onClose}
          >
            {t("celeyou.close")}
          </button>
        </div>
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">{t("celeyou.powered_by")}</p>
          <CeleYouBrandMark variant="lockup" tone="light" markClassName="h-12 w-auto" />
        </div>
      </div>
    </div>
  );
}

export function DigitalCardContinuityView({ card }: { card: DigitalCardPublicPayload }) {
  const { t } = useLocale();
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), card.socials.design);
  const motionMood = celecardMotionMood(theme, card.socials.design?.motion);
  const headingId = useId();
  const descriptionId = useId();
  const reopenRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({ visitorName: "", visitorEmail: "", visitorPhone: "", website: "" });
  const [compactSheet, setCompactSheet] = useState(false);
  const [stageWidth, setStageWidth] = useState("min(100%, 32rem)");

  useEffect(() => {
    const query = window.matchMedia("(orientation: landscape)");
    const apply = () => {
      const height = window.innerHeight;
      const landscape = query.matches;
      const compact = landscape && height < 560;
      setCompactSheet(compact);
      if (compact) {
        setStageWidth("min(100%, calc((100dvh - 5.25rem) * 85.6 / 54))");
        return;
      }
      if (landscape && height < 900) {
        setStageWidth("min(100%, 42rem, calc((100dvh - 7rem) * 85.6 / 54))");
        return;
      }
      setStageWidth("min(100%, 32rem)");
    };
    apply();
    query.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      query.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    window.setTimeout(() => reopenRef.current?.focus(), 0);
  }, []);

  const openRequest = useCallback(() => {
    setModalOpen(false);
    setFormOpen(true);
  }, []);

  const submit = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(card.slug)}/reconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: anonymous ? null : form.visitorName || null,
          visitorEmail: anonymous ? null : form.visitorEmail || null,
          visitorPhone: anonymous ? null : form.visitorPhone || null,
          website: form.website || null,
          anonymous,
          consent: anonymous || consent,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || t("celeyou.send_failed"));
        return;
      }
      setDone(true);
      setFormOpen(false);
    } catch {
      setError(t("celeyou.network_error"));
    } finally {
      setSending(false);
    }
  }, [anonymous, card.slug, consent, form, t]);

  return (
    <main
      className="relative min-h-app-viewport overflow-hidden"
      data-celecard-mood={motionMood}
      style={{
        background: theme.stageBackground,
        paddingTop: "max(1.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>

      <div className="relative mx-auto flex min-h-app-viewport w-full flex-col items-center justify-center px-4 py-6">
        <div className="w-full" style={{ maxWidth: stageWidth }}>
          <div className="relative overflow-hidden rounded-[1.15rem]">
            <div className="pointer-events-none blur-[9px] contrast-[0.9] saturate-[0.74]">
              <DigitalCardFace
                themeId={card.themeId}
                displayName={card.displayName}
                title={card.title}
                company={card.company}
                avatarUrl={card.avatarUrl}
                qrSrc={null}
                qrHref={null}
                className="max-w-none"
                portraitFrame={card.socials.portraitFrame}
                companyLogo
                companyLogoUrl={card.socials.companyLogoUrl}
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 rounded-[1.15rem]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,252,247,0.22) 0%, rgba(255,252,247,0.08) 42%, rgba(12,10,8,0.18) 100%)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
              }}
              aria-hidden
            />
          </div>
        </div>

        {done ? (
          <div className="mt-6 w-full max-w-md rounded-3xl border border-white/50 bg-[#f7f1e8] p-5 text-center shadow-[0_18px_50px_rgba(20,14,8,0.18)]">
            <p className="font-display text-lg font-semibold text-stone-900">{t("celeyou.courtesy_confirm_heading")}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{t("celeyou.courtesy_confirm_body")}</p>
          </div>
        ) : (
          <button
            ref={reopenRef}
            type="button"
            onClick={openRequest}
            className="mt-6 rounded-full border border-white/35 bg-white/18 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-white"
          >
            {t("celeyou.courtesy_reopen")}
          </button>
        )}
      </div>

      <ContinuityPanel
        open={modalOpen && !done}
        compact={compactSheet}
        accent={theme.accent}
        headingId={headingId}
        descriptionId={descriptionId}
        onClose={closeModal}
        onRequest={openRequest}
      />

      {formOpen && !done ? (
        <div
          className={`pointer-events-none fixed inset-0 z-50 flex justify-center p-4 ${
            compactSheet ? "items-end pb-[max(1rem,env(safe-area-inset-bottom))]" : "items-end sm:items-center"
          }`}
        >
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-stone-950/20"
            aria-label={t("celeyou.dismiss")}
            onClick={() => setFormOpen(false)}
          />
          <form
            className={`pointer-events-auto relative z-10 w-full max-w-md border border-white/40 bg-[#f7f1e8] shadow-[0_24px_80px_rgba(20,14,8,0.28)] ${
              compactSheet ? "rounded-t-3xl rounded-b-2xl p-5" : "rounded-3xl p-6"
            }`}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <p className="font-display text-xl font-semibold text-stone-900">{t("celeyou.courtesy_primary")}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{t("celeyou.courtesy_consent")}</p>
            {!anonymous ? (
              <div className="mt-4 space-y-3">
                <input
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  placeholder={t("celeyou.courtesy_name_optional")}
                  value={form.visitorName}
                  onChange={(event) => setForm((f) => ({ ...f, visitorName: event.target.value }))}
                />
                <input
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  placeholder={t("celeyou.courtesy_email_optional")}
                  type="email"
                  value={form.visitorEmail}
                  onChange={(event) => setForm((f) => ({ ...f, visitorEmail: event.target.value }))}
                />
                <input
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  placeholder={t("celeyou.courtesy_phone_optional")}
                  value={form.visitorPhone}
                  onChange={(event) => setForm((f) => ({ ...f, visitorPhone: event.target.value }))}
                />
                <input
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => setForm((f) => ({ ...f, website: event.target.value }))}
                />
                <label className="flex items-start gap-2 text-xs leading-5 text-stone-600">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  {t("celeyou.courtesy_consent_check")}
                </label>
              </div>
            ) : null}
            <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
              {t("celeyou.courtesy_anonymous")}
            </label>
            {error ? <p className="mt-3 text-sm text-stone-700">{error}</p> : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={sending || (!anonymous && Boolean(form.visitorEmail || form.visitorPhone) && !consent)}
                className="min-h-11 flex-1 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
                style={{ background: theme.accent, color: inkOnAccent(theme.accent) }}
              >
                {sending ? t("celeyou.sending") : t("celeyou.courtesy_primary")}
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl border border-stone-300/80 bg-white/70 px-5 text-sm font-semibold text-stone-700"
                onClick={() => setFormOpen(false)}
              >
                {t("celeyou.close")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

export function DigitalCardUnavailableView({
  mode,
}: {
  mode?: DigitalCardPublicPayload["presentationMode"];
}) {
  const { t } = useLocale();
  const copy = t("celeyou.courtesy_unavailable_heading");
  const body = t("celeyou.courtesy_unavailable_body");
  return (
    <main className="min-h-app-viewport grid place-items-center bg-stone-100 px-4">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <CeleYouBrandMark variant="lockup" tone="light" markClassName="h-16 w-auto" className="mb-4 justify-center" />
        <p className="font-display text-xl font-semibold text-stone-900">{copy}</p>
        <p className="mt-2 text-sm text-stone-600">{body}</p>
      </div>
    </main>
  );
}
