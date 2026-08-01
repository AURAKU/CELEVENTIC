"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, Loader2, RotateCw, XCircle } from "lucide-react";
import type { PublicGiftPaymentView } from "@/lib/gifts/gift-privacy";
import type { GiftThemeCssVars } from "@/lib/gifts/gift-theme";
import { formatMinor } from "@/lib/gifts/money";

/**
 * Post-checkout status screen.
 *
 * The guest lands here straight from the provider. We treat that redirect as a
 * signal to go and ask our own server, never as evidence of payment: the screen
 * stays in "awaiting confirmation" until the backend reports SUCCESS, which it
 * only does after verifying the transaction with Paystack.
 */

interface Props {
  reference: string;
  publicToken: string;
  initial: PublicGiftPaymentView;
  themeVars: GiftThemeCssVars;
  thankYou: { title: string; message: string };
  eventTitle: string;
  hostName: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes of patient waiting

export function GiftStatusScreen({
  reference,
  publicToken,
  initial,
  themeVars,
  thankYou,
  eventTitle,
  hostName,
}: Props) {
  const [gift, setGift] = useState<PublicGiftPaymentView>(initial);
  const [checking, setChecking] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const pollCount = useRef(0);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/gifts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (res.ok) {
        const payload = await res.json();
        setGift(payload.data as PublicGiftPaymentView);
      }
    } catch {
      // A failed poll is not a failed payment, keep waiting.
    } finally {
      setChecking(false);
    }
  }, [reference]);

  useEffect(() => {
    if (gift.state === "success" || gift.state === "failed" || gaveUp) return;

    const timer = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      void check();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [gift.state, gaveUp, check]);

  return (
    <main className="gift-shell" style={themeVars as React.CSSProperties}>
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-14">
        {gift.state === "success" ? (
          <SuccessPanel
            gift={gift}
            thankYou={thankYou}
            eventTitle={eventTitle}
            hostName={hostName}
          />
        ) : gift.state === "failed" ? (
          <FailedPanel gift={gift} publicToken={publicToken} />
        ) : (
          <PendingPanel
            gift={gift}
            checking={checking}
            gaveUp={gaveUp}
            onCheck={() => {
              setGaveUp(false);
              pollCount.current = 0;
              void check();
            }}
          />
        )}
      </div>
    </main>
  );
}

function SuccessPanel({
  gift,
  thankYou,
  eventTitle,
  hostName,
}: {
  gift: PublicGiftPaymentView;
  thankYou: { title: string; message: string };
  eventTitle: string;
  hostName: string;
}) {
  return (
    <div className="relative">
      <Petals />
      <div className="gift-card gift-step-enter relative p-8 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--gift-color-accent) 18%, transparent)",
            boxShadow: "0 0 40px color-mix(in srgb, var(--gift-color-accent) 35%, transparent)",
          }}
        >
          <CheckCircle2
            className="h-9 w-9"
            style={{ color: "var(--gift-color-accent)" }}
            aria-hidden
          />
        </div>
        <p
          className="mt-6 text-xs font-bold uppercase tracking-[0.28em]"
          style={{ color: "var(--gift-color-accent)" }}
        >
          Thank you
        </p>
        <h1 className="gift-display mt-3 text-3xl">{thankYou.title}</h1>
        <div className="gift-rule mx-auto mt-5 w-24" />
        <p className="mt-5 text-sm leading-relaxed" style={{ color: "var(--gift-color-ink-muted)" }}>
          {thankYou.message ||
            "Your gift has been received successfully. Your kindness and warm wishes are deeply appreciated."}
        </p>

        <p className="gift-script mt-7 text-2xl" style={{ color: "var(--gift-color-accent)" }}>
          {formatMinor(gift.amountMinor, gift.currency)}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--gift-color-ink-muted)" }}>
          {hostName} · {eventTitle}
        </p>
        <dl className="mx-auto mt-6 max-w-sm space-y-2 text-left text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
          <div className="flex justify-between gap-3">
            <dt>Reference</dt>
            <dd className="font-semibold">{gift.reference}</dd>
          </div>
          {gift.method ? (
            <div className="flex justify-between gap-3">
              <dt>Method</dt>
              <dd className="font-semibold">{gift.method}</dd>
            </div>
          ) : null}
          {gift.paidAt ? (
            <div className="flex justify-between gap-3">
              <dt>Paid</dt>
              <dd className="font-semibold">{new Date(gift.paidAt).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>

        {gift.companionReturnUrl ? (
          <Link
            href={gift.companionReturnUrl}
            className="gift-cta mt-8 inline-flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
          >
            Return to the Celebration
          </Link>
        ) : null}

        {gift.receiptUrl && (
          <>
            <Link
              href={gift.receiptUrl}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--gift-color-ink-muted)" }}
            >
              <FileText className="h-4 w-4" aria-hidden />
              View Receipt
            </Link>
            <a
              href={gift.receiptUrl}
              download
              className="mt-1 inline-flex w-full items-center justify-center px-6 py-2 text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--gift-color-ink-muted)" }}
            >
              Download Receipt
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function PendingPanel({
  gift,
  checking,
  gaveUp,
  onCheck,
}: {
  gift: PublicGiftPaymentView;
  checking: boolean;
  gaveUp: boolean;
  onCheck: () => void;
}) {
  return (
    <div className="gift-card gift-step-enter p-8 text-center">
      <Clock
        className="gift-pending-pulse mx-auto h-9 w-9"
        style={{ color: "var(--gift-color-accent)" }}
        aria-hidden
      />
      <h1 className="gift-display mt-6 text-2xl">Confirming your gift</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--gift-color-ink-muted)" }}>
        Your payment is still being confirmed. You may safely leave this page and
        check again shortly. Approve any prompt on your phone if you have not
        already.
      </p>

      <p className="gift-display mt-6 text-xl">
        {formatMinor(gift.amountMinor, gift.currency)}
      </p>

      <div
        className="mt-6 flex items-center justify-center gap-2 text-xs"
        role="status"
        aria-live="polite"
      >
        {checking ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Checking with your provider…
          </>
        ) : gaveUp ? (
          <span style={{ color: "var(--gift-color-ink-muted)" }}>
            Still waiting. Mobile money can take a few minutes.
          </span>
        ) : (
          <span style={{ color: "var(--gift-color-ink-muted)" }}>
            We are checking automatically.
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className="gift-cta mt-6 inline-flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-medium"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Check again
      </button>

      <p className="mt-5 text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
        Reference {gift.reference}
      </p>
    </div>
  );
}

function FailedPanel({
  gift,
  publicToken,
}: {
  gift: PublicGiftPaymentView;
  publicToken: string;
}) {
  return (
    <div className="gift-card gift-step-enter p-8 text-center">
      <XCircle className="mx-auto h-9 w-9" style={{ color: "#b91c1c" }} aria-hidden />
      <h1 className="gift-display mt-6 text-2xl">Gift not completed</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--gift-color-ink-muted)" }}>
        {gift.failureReason?.toLowerCase().includes("mismatch")
          ? "We could not safely confirm this payment. The Celeventic finance team has been alerted."
          : gift.failureReason ??
            "We could not complete this gift. No successful payment has been recorded."}
      </p>

      <Link
        href={`/gift/${publicToken}`}
        className="gift-cta mt-7 inline-flex w-full items-center justify-center px-6 py-4 text-sm font-medium"
      >
        Retry
      </Link>

      {gift.companionReturnUrl ? (
        <Link
          href={gift.companionReturnUrl}
          className="mt-3 inline-flex w-full items-center justify-center px-6 py-3 text-sm font-medium underline-offset-4 hover:underline"
          style={{ color: "var(--gift-color-ink-muted)" }}
        >
          Return to Event Companion
        </Link>
      ) : null}

      <p className="mt-5 text-xs" style={{ color: "var(--gift-color-ink-muted)" }}>
        Reference {gift.reference}
      </p>
    </div>
  );
}

/** Six petals, staggered, restrained enough to feel like stationery, not confetti. */
function Petals() {
  const petals = [0, 1, 2, 3, 4, 5];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {petals.map((i) => (
        <span
          key={i}
          className="gift-petal"
          style={{
            left: `${8 + i * 16}%`,
            animationDelay: `${i * 1.4}s`,
            animationDuration: `${8 + (i % 3) * 2}s`,
          }}
        />
      ))}
    </div>
  );
}
