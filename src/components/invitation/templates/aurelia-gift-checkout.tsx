"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Gift, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { PublicGiftCampaignView } from "@/lib/gifts/gift-privacy";
import {
  detectMethodFromPhone,
  listEnabledGiftPaymentMethods,
  type GiftPaymentMethodId,
} from "@/lib/gifts/gift-providers";
import { GiftNetworkLogo } from "@/components/gifts/gift-network-logo";
import { DEFAULT_MIN_AMOUNT_MINOR, DEFAULT_SUGGESTED_AMOUNTS_MINOR } from "@/lib/gifts/gift-copy";
import { formatMinor, MoneyError, toMinorUnits } from "@/lib/gifts/money";
import styles from "./aurelia-editorial-wedding.module.css";

type MethodOption = {
  id: string;
  label: string;
  shortLabel: string;
};

function publicTokenFromGiftUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://celeventic.local");
    const parts = parsed.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("gift");
    const token = index >= 0 ? parts[index + 1] : null;
    return token && token.length >= 8 ? token : null;
  } catch {
    return null;
  }
}

export function AureliaGiftCheckout({
  giftUrl,
  giftQrImageUrl,
  giftTitle,
  giftSubtitle,
  giftCtaLabel,
  giftPrivacyNote,
  guestName: initialGuestName,
  guestQrToken,
  returnPath,
  detailsNote,
}: {
  giftUrl?: string | null;
  giftQrImageUrl?: string | null;
  giftTitle?: string | null;
  giftSubtitle?: string | null;
  giftCtaLabel?: string | null;
  giftPrivacyNote?: string | null;
  guestName?: string;
  guestQrToken?: string | null;
  returnPath?: string | null;
  detailsNote?: string;
}) {
  const token = useMemo(() => publicTokenFromGiftUrl(giftUrl), [giftUrl]);
  const fallbackMethods = useMemo<MethodOption[]>(
    () =>
      listEnabledGiftPaymentMethods().map((method) => ({
        id: method.id,
        label: method.label,
        shortLabel: method.shortLabel,
      })),
    []
  );

  const [campaign, setCampaign] = useState<PublicGiftCampaignView | null>(null);
  const [methods, setMethods] = useState<MethodOption[]>(fallbackMethods);
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [guestName, setGuestName] = useState(initialGuestName?.trim() ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#aurelia-gifts") setOpen(true);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const query = guestQrToken ? `?g=${encodeURIComponent(guestQrToken)}` : "";
    fetch(`/api/gifts/campaign/${encodeURIComponent(token)}${query}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "Gift wallet is not available.");
        if (cancelled) return;
        setCampaign(payload.data.campaign as PublicGiftCampaignView);
        if (Array.isArray(payload.data.methods) && payload.data.methods.length) {
          setMethods(payload.data.methods.filter((item: MethodOption) => item.id !== "CARD"));
        }
        const prefill = payload.data.campaign?.guest?.name;
        if (typeof prefill === "string" && prefill.trim()) setGuestName(prefill.trim());
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, guestQrToken]);

  const currency = campaign?.currency ?? "GHS";
  const suggested = campaign?.suggestedAmountsMinor?.length
    ? campaign.suggestedAmountsMinor
    : DEFAULT_SUGGESTED_AMOUNTS_MINOR;
  const minAmount = campaign?.minAmountMinor ?? DEFAULT_MIN_AMOUNT_MINOR;
  const maxAmount = campaign?.maxAmountMinor ?? null;
  const closed = campaign?.status === "CLOSED";

  const amountError = useMemo(() => {
    if (amountMinor === null) return null;
    if (amountMinor < minAmount) {
      return `The minimum gift is ${formatMinor(minAmount, currency)}`;
    }
    if (maxAmount && amountMinor > maxAmount) {
      return `The maximum gift is ${formatMinor(maxAmount, currency)}`;
    }
    return null;
  }, [amountMinor, minAmount, maxAmount, currency]);

  const chooseCustom = useCallback(
    (raw: string) => {
      setCustomAmount(raw);
      if (!raw.trim()) {
        setAmountMinor(null);
        return;
      }
      try {
        setAmountMinor(toMinorUnits(raw, currency));
        setError(null);
      } catch (err) {
        setAmountMinor(null);
        if (err instanceof MoneyError) setError(err.message);
      }
    },
    [currency]
  );

  async function submit() {
    if (!token) {
      setError("The gift wallet is not open on this invitation yet.");
      return;
    }
    if (amountMinor === null || amountError || !method) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: token,
          amountMinor,
          method,
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          guestMessage: guestMessage.trim() || undefined,
          guestToken: guestQrToken || undefined,
          companionReturnUrl: returnPath || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "We could not start this gift. Please try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = payload.data.authorizationUrl;
    } catch {
      setError("Network problem. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  const canPay = Boolean(token && amountMinor && !amountError && method && !submitting && !closed);
  const cta = giftCtaLabel || campaign?.ctaLabel || "Send a gift";

  if (closed) {
    return (
      <div className={styles.giftCheckout}>
        {detailsNote ? <p className={styles.giftNote}>{detailsNote}</p> : null}
        <p className={styles.giftStatus}>{campaign?.closedReason || "Gifting has closed."}</p>
      </div>
    );
  }

  const form = (
    <div className={styles.giftPanel} id="aurelia-gift-panel">
      {loading ? (
        <p className={styles.giftStatus} aria-busy="true">
          Opening the gift wallet…
        </p>
      ) : (
        <>
          <p className={styles.giftKicker}>{giftTitle || campaign?.title || "Send a gift"}</p>
          <p className={styles.giftLede}>
            {giftSubtitle ||
              campaign?.subtitle ||
              "A contribution is entirely optional and received with love."}
          </p>

          {loadError ? (
            <p className={styles.giftError} role="alert">
              {loadError}
            </p>
          ) : null}

          <p className={styles.giftLabel}>{campaign?.amountPrompt || "Choose an amount"}</p>
          <div className={styles.giftAmounts}>
            {suggested.map((value) => {
              const selected = amountMinor === value && !customAmount;
              return (
                <button
                  key={value}
                  type="button"
                  className={selected ? styles.giftAmountSelected : styles.giftAmount}
                  aria-pressed={selected}
                  onClick={() => {
                    setAmountMinor(value);
                    setCustomAmount("");
                    setError(null);
                  }}
                >
                  {formatMinor(value, currency, { withSymbol: false })}
                </button>
              );
            })}
          </div>
          {(campaign?.allowCustomAmount ?? true) ? (
            <label className={styles.giftField}>
              <span>Or enter your own ({currency})</span>
              <input
                inputMode="decimal"
                value={customAmount}
                placeholder="0.00"
                onChange={(event) => chooseCustom(event.target.value)}
              />
            </label>
          ) : null}
          {amountError ? (
            <p className={styles.giftError} role="alert">
              {amountError}
            </p>
          ) : null}

          <label className={styles.giftField}>
            <span>Your name</span>
            <input
              value={guestName}
              autoComplete="name"
              placeholder="Your name"
              onChange={(event) => setGuestName(event.target.value)}
            />
          </label>
          <label className={styles.giftField}>
            <span>Mobile money number</span>
            <input
              type="tel"
              autoComplete="tel"
              value={guestPhone}
              placeholder="0XX XXX XXXX"
              onChange={(event) => {
                setGuestPhone(event.target.value);
                const detected = detectMethodFromPhone(event.target.value);
                if (detected) setMethod(detected);
              }}
            />
          </label>
          {(campaign?.allowGuestMessage ?? true) ? (
            <label className={styles.giftField}>
              <span>{campaign?.messagePrompt || "A note for the couple"}</span>
              <textarea
                rows={3}
                maxLength={500}
                value={guestMessage}
                placeholder="Optional blessing"
                onChange={(event) => setGuestMessage(event.target.value)}
              />
            </label>
          ) : null}

          <p className={styles.giftLabel}>Pay with</p>
          <div className={styles.giftMethods}>
            {methods
              .filter((option) => option.id !== "CARD")
              .map((option) => {
                const selected = method === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={selected ? styles.giftMethodSelected : styles.giftMethod}
                    aria-pressed={selected}
                    onClick={() => setMethod(option.id as GiftPaymentMethodId)}
                  >
                    <GiftNetworkLogo methodId={option.id} className={styles.giftMethodLogo} />
                    <span>{option.shortLabel}</span>
                  </button>
                );
              })}
          </div>

          {error ? (
            <p className={styles.giftError} role="alert">
              {error}
            </p>
          ) : null}

          <button type="button" className={styles.giftPay} disabled={!canPay} onClick={() => void submit()}>
            {submitting ? <Loader2 className={styles.giftSpin} aria-hidden /> : <Gift size={15} aria-hidden />}
            {submitting ? "Opening Paystack…" : cta}
          </button>

          {giftQrImageUrl ? (
            <div className={styles.giftQr}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={giftQrImageUrl} alt="QR code to send a gift" width={112} height={112} />
              <p>Scan to open on another device</p>
            </div>
          ) : null}

          <p className={styles.giftPrivacy}>
            <Lock size={12} aria-hidden />
            {giftPrivacyNote || campaign?.privacyNote || "Your gift is private."}
          </p>
          <p className={styles.giftPrivacy}>
            <ShieldCheck size={12} aria-hidden />
            Payments are processed securely by Paystack.
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className={styles.giftCheckout}>
      {detailsNote ? <p className={styles.giftNote}>{detailsNote}</p> : null}
      <button
        type="button"
        className={styles.giftToggle}
        aria-expanded={open}
        aria-controls="aurelia-gift-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Gift size={15} aria-hidden />
        <span>{open ? "Hide gift details" : cta}</span>
        <ChevronDown className={open ? styles.giftChevronOpen : styles.giftChevron} size={18} aria-hidden />
      </button>
      {open ? form : null}
    </div>
  );
}
