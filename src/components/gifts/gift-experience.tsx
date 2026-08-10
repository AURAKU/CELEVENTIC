"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Gift, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { PublicGiftCampaignView } from "@/lib/gifts/gift-privacy";
import type { GiftThemeCssVars } from "@/lib/gifts/gift-theme";
import { formatMinor, MoneyError, toMinorUnits } from "@/lib/gifts/money";
import { detectMethodFromPhone } from "@/lib/gifts/gift-providers";

/**
 * The guest gifting flow.
 *
 * Four short steps, amount, who it's from, how to pay, confirm, then the
 * provider's own authorisation screen. Nothing in here ever claims a payment
 * succeeded: the moment we hand off to Paystack the guest is routed to the
 * status page, which waits for the server to confirm.
 */

export interface GiftMethodOption {
  id: string;
  label: string;
  shortLabel: string;
  aka: string | null;
  channel: string;
  accentClass: string;
}

interface Props {
  campaign: PublicGiftCampaignView;
  themeVars: GiftThemeCssVars;
  methods: GiftMethodOption[];
  guestToken?: string | null;
  companionReturnUrl?: string | null;
}

type Step = "landing" | "amount" | "details" | "method" | "confirm" | "redirecting";

const STEP_ORDER: Step[] = ["landing", "amount", "details", "method", "confirm"];

export function GiftExperience({
  campaign,
  themeVars,
  methods,
  guestToken,
  companionReturnUrl,
}: Props) {
  const [step, setStep] = useState<Step>("landing");
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [guestName, setGuestName] = useState(campaign.guest?.name ?? "");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [method, setMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closed = campaign.status === "CLOSED";

  const goTo = useCallback((next: Step) => {
    setError(null);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    const index = STEP_ORDER.indexOf(step);
    goTo(STEP_ORDER[Math.max(0, index - 1)]);
  }, [step, goTo]);

  const chooseCustomAmount = useCallback(
    (raw: string) => {
      setCustomAmount(raw);
      if (!raw.trim()) {
        setAmountMinor(null);
        return;
      }
      try {
        setAmountMinor(toMinorUnits(raw, campaign.currency));
        setError(null);
      } catch (err) {
        setAmountMinor(null);
        if (err instanceof MoneyError) setError(err.message);
      }
    },
    [campaign.currency]
  );

  const amountError = useMemo(() => {
    if (amountMinor === null) return null;
    if (amountMinor < campaign.minAmountMinor) {
      return `The minimum gift is ${formatMinor(campaign.minAmountMinor, campaign.currency)}`;
    }
    if (campaign.maxAmountMinor && amountMinor > campaign.maxAmountMinor) {
      return `The maximum gift is ${formatMinor(campaign.maxAmountMinor, campaign.currency)}`;
    }
    return null;
  }, [amountMinor, campaign.minAmountMinor, campaign.maxAmountMinor, campaign.currency]);

  const detailsValid =
    (!campaign.requireGuestName || isAnonymous || guestName.trim().length > 1) &&
    (!campaign.requireGuestContact || Boolean(guestEmail.trim() || guestPhone.trim()));

  async function submit() {
    if (amountMinor === null || !method) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/gifts/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: campaign.publicToken,
          amountMinor,
          method,
          guestName: isAnonymous ? undefined : guestName.trim() || undefined,
          guestEmail: guestEmail.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          guestMessage: guestMessage.trim() || undefined,
          isAnonymous,
          guestToken: guestToken || undefined,
          companionReturnUrl: companionReturnUrl || undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error ?? "We could not start this gift. Please try again.");
        setSubmitting(false);
        return;
      }

      // Hand off to the provider. The guest comes back to the status page,
      // which is the only place a success can ever be shown.
      setStep("redirecting");
      window.location.href = payload.data.authorizationUrl;
    } catch {
      setError("Network problem. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="gift-shell" style={themeVars as React.CSSProperties}>
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-10 sm:py-16">
        <header className="text-center">
          <p className="gift-hosts text-[11px] uppercase sm:text-xs">
            {campaign.event.hostName}
          </p>
          <h1 className="gift-display mt-3 text-3xl leading-tight sm:text-4xl">
            {campaign.event.title}
          </h1>
          <div className="gift-rule mx-auto mt-5 w-32" />
        </header>

        <section className="mt-8 flex-1">
          {closed ? (
            <ClosedNotice reason={campaign.closedReason} />
          ) : step === "landing" ? (
            <LandingStep campaign={campaign} onStart={() => goTo("amount")} />
          ) : step === "amount" ? (
            <AmountStep
              campaign={campaign}
              amountMinor={amountMinor}
              customAmount={customAmount}
              amountError={amountError}
              onPick={(value) => {
                setAmountMinor(value);
                setCustomAmount("");
                setError(null);
              }}
              onCustom={chooseCustomAmount}
              onNext={() => goTo("details")}
              onBack={back}
            />
          ) : step === "details" ? (
            <DetailsStep
              campaign={campaign}
              guestName={guestName}
              guestEmail={guestEmail}
              guestPhone={guestPhone}
              guestMessage={guestMessage}
              isAnonymous={isAnonymous}
              valid={detailsValid}
              onChange={(patch) => {
                if (patch.guestName !== undefined) setGuestName(patch.guestName);
                if (patch.guestEmail !== undefined) setGuestEmail(patch.guestEmail);
                if (patch.guestPhone !== undefined) {
                  setGuestPhone(patch.guestPhone);
                  const detected = detectMethodFromPhone(patch.guestPhone);
                  if (detected && !method) setMethod(detected);
                }
                if (patch.guestMessage !== undefined) setGuestMessage(patch.guestMessage);
                if (patch.isAnonymous !== undefined) setIsAnonymous(patch.isAnonymous);
              }}
              onNext={() => goTo("method")}
              onBack={back}
            />
          ) : step === "method" ? (
            <MethodStep
              methods={methods}
              selected={method}
              onSelect={setMethod}
              onNext={() => goTo("confirm")}
              onBack={back}
            />
          ) : step === "confirm" ? (
            <ConfirmStep
              campaign={campaign}
              amountMinor={amountMinor}
              method={methods.find((m) => m.id === method) ?? null}
              guestName={isAnonymous ? "Anonymous" : guestName}
              submitting={submitting}
              onSubmit={submit}
              onBack={back}
            />
          ) : (
            <RedirectingStep />
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg px-4 py-3 text-sm"
              style={{
                background: "color-mix(in srgb, #b91c1c 8%, transparent)",
                color: "#b91c1c",
              }}
            >
              {error}
            </p>
          )}
        </section>

        <footer
          className="mt-10 flex flex-col items-center gap-2 text-center text-xs"
          style={{ color: "var(--gift-color-ink-muted)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" aria-hidden />
            {campaign.privacyNote}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Payments are processed securely by Paystack.
          </span>
        </footer>
      </div>
    </main>
  );
}

function ClosedNotice({ reason }: { reason: string | null }) {
  return (
    <div className="gift-card gift-step-enter p-8 text-center">
      <GiftMark />
      <p className="gift-display mt-5 text-xl">Gifting has closed</p>
      <p className="mt-2 text-sm" style={{ color: "var(--gift-color-ink-muted)" }}>
        {reason ?? "Thank you for thinking of the celebrants."}
      </p>
    </div>
  );
}

/** Warm gift seal — filled bow + box, themed via currentColor. */
function GiftMark() {
  return (
    <div className="gift-ribbon mx-auto" aria-hidden>
      <span className="gift-ribbon-icon">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 22.5h28v17.5a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V22.5Z"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 16.5h31a2.5 2.5 0 0 1 0 5h-31a2.5 2.5 0 1 1 0-5Z"
            fill="currentColor"
            fillOpacity="0.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M24 16.5v26.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M24 16.5c-1.2-5.2-5.4-8-9.2-7.2-2.8.6-4.3 3.2-3.5 5.6.7 2.2 3.6 3.4 12.7 1.6Z"
            fill="currentColor"
            fillOpacity="0.55"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M24 16.5c1.2-5.2 5.4-8 9.2-7.2 2.8.6 4.3 3.2 3.5 5.6-.7 2.2-3.6 3.4-12.7 1.6Z"
            fill="currentColor"
            fillOpacity="0.55"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="16.5" r="2.2" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

function LandingStep({
  campaign,
  onStart,
}: {
  campaign: PublicGiftCampaignView;
  onStart: () => void;
}) {
  return (
    <div className="gift-step-enter text-center">
      <GiftMark />

      <h2 className="gift-display mt-7 text-2xl sm:text-[1.7rem]">{campaign.title}</h2>
      {campaign.guest?.name && (
        <p className="gift-script mt-2 text-xl" style={{ color: "var(--gift-color-accent)" }}>
          {campaign.guest.name}
        </p>
      )}
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--gift-color-ink-muted)" }}>
        {campaign.subtitle}
      </p>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed">{campaign.description}</p>
      <p
        className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--gift-color-accent)" }}
      >
        Entirely optional · Securely processed
      </p>

      <button type="button" onClick={onStart} className="gift-cta mt-8 w-full px-6 py-4 text-sm font-medium tracking-wide">
        Continue
      </button>
    </div>
  );
}

function AmountStep({
  campaign,
  amountMinor,
  customAmount,
  amountError,
  onPick,
  onCustom,
  onNext,
  onBack,
}: {
  campaign: PublicGiftCampaignView;
  amountMinor: number | null;
  customAmount: string;
  amountError: string | null;
  onPick: (value: number) => void;
  onCustom: (raw: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = amountMinor !== null && !amountError;

  return (
    <div className="gift-card gift-step-enter p-6">
      <StepHeading title={campaign.amountPrompt} step={1} onBack={onBack} />

      <div className="mt-5 grid grid-cols-2 gap-3">
        {campaign.suggestedAmountsMinor.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            data-selected={amountMinor === value && !customAmount}
            aria-pressed={amountMinor === value && !customAmount}
            className="gift-chip gift-display px-4 py-4 text-base tracking-wide"
          >
            {formatMinor(value, campaign.currency, { withSymbol: false })}
          </button>
        ))}
      </div>

      {campaign.allowCustomAmount && (
        <div className="mt-5">
          <label htmlFor="gift-custom-amount" className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--gift-color-ink-muted)" }}>
            Or enter your own
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--gift-color-ink-muted)" }}>
              {campaign.currency}
            </span>
            <input
              id="gift-custom-amount"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => onCustom(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border px-3 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-[var(--gift-color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--gift-color-accent)_18%,transparent)]"
              style={{
                borderColor: "var(--gift-color-border)",
                background: "color-mix(in srgb, var(--gift-color-surface) 55%, white)",
                color: "var(--gift-color-ink)",
              }}
            />
          </div>
        </div>
      )}

      {amountError && (
        <p className="mt-3 text-xs" style={{ color: "#b91c1c" }}>
          {amountError}
        </p>
      )}

      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="gift-cta mt-6 flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function DetailsStep({
  campaign,
  guestName,
  guestEmail,
  guestPhone,
  guestMessage,
  isAnonymous,
  valid,
  onChange,
  onNext,
  onBack,
}: {
  campaign: PublicGiftCampaignView;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestMessage: string;
  isAnonymous: boolean;
  valid: boolean;
  onChange: (patch: Partial<Record<
    "guestName" | "guestEmail" | "guestPhone" | "guestMessage",
    string
  >> & { isAnonymous?: boolean }) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="gift-card gift-step-enter p-6">
      <StepHeading title="Who is this gift from?" step={2} onBack={onBack} />
      <p className="mt-2 text-sm" style={{ color: "var(--gift-color-ink-muted)" }}>
        Share your name only if you would like the hosts to know who the gift is from.
      </p>

      <div className="mt-5 space-y-4">
        {!isAnonymous && (
          <Field
            id="gift-name"
            label={campaign.requireGuestName ? "Your name" : "Your name (optional)"}
            value={guestName}
            onChange={(v) => onChange({ guestName: v })}
            autoComplete="name"
          />
        )}

        <Field
          id="gift-email"
          label="Email for your receipt"
          type="email"
          value={guestEmail}
          onChange={(v) => onChange({ guestEmail: v })}
          autoComplete="email"
        />

        <Field
          id="gift-phone"
          label="Mobile money number"
          type="tel"
          value={guestPhone}
          onChange={(v) => onChange({ guestPhone: v })}
          autoComplete="tel"
          hint="We use this to pick the right network for you."
        />

        {campaign.allowGuestMessage && (
          <div>
            <label
              htmlFor="gift-message"
              className="text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--gift-color-ink-muted)" }}
            >
              {campaign.messagePrompt}
            </label>
            <textarea
              id="gift-message"
              rows={3}
              maxLength={500}
              value={guestMessage}
              onChange={(e) => onChange({ guestMessage: e.target.value })}
              className="mt-2 w-full rounded-lg border px-3 py-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--gift-color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--gift-color-accent)_18%,transparent)]"
              style={{
                borderColor: "var(--gift-color-border)",
                background: "color-mix(in srgb, var(--gift-color-surface) 55%, white)",
                color: "var(--gift-color-ink)",
              }}
            />
          </div>
        )}

        {campaign.allowAnonymous && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => onChange({ isAnonymous: e.target.checked })}
              className="h-4 w-4"
              style={{ accentColor: "var(--gift-color-accent)" }}
            />
            Send this gift anonymously
          </label>
        )}
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={onNext}
        className="gift-cta mt-6 flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      {!valid && (
        <p className="mt-3 text-center text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
          {campaign.requireGuestContact
            ? "Add an email or phone number so we can send your receipt."
            : "Tell the host who this gift is from."}
        </p>
      )}
    </div>
  );
}

function MethodStep({
  methods,
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  methods: GiftMethodOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="gift-card gift-step-enter p-6">
      <StepHeading title="How would you like to pay?" step={3} onBack={onBack} />

      <div className="mt-5 space-y-3">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            data-selected={selected === m.id}
            aria-pressed={selected === m.id}
            className={`gift-chip flex w-full items-center justify-between px-4 py-4 text-left text-sm ${m.accentClass}`}
          >
            <span>
              <span className="font-medium">{m.label}</span>
              {m.aka && (
                <span className="ml-2 text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
                  formerly {m.aka}
                </span>
              )}
            </span>
            {selected === m.id && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--gift-color-accent)" }}
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={onNext}
        className="gift-cta mt-6 flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ConfirmStep({
  campaign,
  amountMinor,
  method,
  guestName,
  submitting,
  onSubmit,
  onBack,
}: {
  campaign: PublicGiftCampaignView;
  amountMinor: number | null;
  method: GiftMethodOption | null;
  guestName: string;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="gift-card gift-step-enter p-6">
      <StepHeading title="Confirm your gift" step={4} onBack={onBack} />

      <dl className="mt-5 space-y-3 text-sm">
        <Row label="Gift amount">
          <span className="gift-display text-lg">
            {amountMinor !== null ? formatMinor(amountMinor, campaign.currency) : ", "}
          </span>
        </Row>
        <Row label="From">{guestName || "A guest"}</Row>
        <Row label="Via">{method?.label ?? "—"}</Row>
      </dl>

      <div className="gift-rule my-6" />

      <button
        type="button"
        disabled={submitting || amountMinor === null || !method}
        onClick={onSubmit}
        className="gift-cta flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Preparing your gift…
          </>
        ) : (
          <>
            <Gift className="h-4 w-4" aria-hidden />
            {campaign.ctaLabel}
          </>
        )}
      </button>

      <p className="mt-4 text-center text-xs leading-relaxed" style={{ color: "var(--gift-color-ink-muted)" }}>
        You&apos;ll approve this on your phone or card — nothing is taken until you
        authorise it.
      </p>
    </div>
  );
}

function RedirectingStep() {
  return (
    <div className="gift-card gift-step-enter p-10 text-center">
      <Loader2
        className="mx-auto h-7 w-7 animate-spin"
        style={{ color: "var(--gift-color-accent)" }}
        aria-hidden
      />
      <p className="gift-display mt-5 text-lg">Opening a secure gift screen…</p>
      <p className="mt-2 text-sm" style={{ color: "var(--gift-color-ink-muted)" }}>
        Please don&apos;t close this page.
      </p>
    </div>
  );
}

function StepHeading({
  title,
  step,
  onBack,
}: {
  title: string;
  step: number;
  onBack: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="mt-0.5 rounded-full p-1.5"
        style={{ color: "var(--gift-color-ink-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--gift-color-ink-muted)" }}>
          Step {step} of 4
        </p>
        <h2 className="gift-display mt-1 text-lg">{title}</h2>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs uppercase tracking-[0.18em]"
        style={{ color: "var(--gift-color-ink-muted)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border px-3 py-3 text-base outline-none transition-[border-color,box-shadow] focus:border-[var(--gift-color-accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--gift-color-accent)_18%,transparent)]"
        style={{
          borderColor: "var(--gift-color-border)",
          background: "color-mix(in srgb, var(--gift-color-surface) 55%, white)",
          color: "var(--gift-color-ink)",
        }}
      />
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt style={{ color: "var(--gift-color-ink-muted)" }}>{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
