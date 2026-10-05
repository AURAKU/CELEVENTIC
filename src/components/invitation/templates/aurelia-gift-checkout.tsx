"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Gift,
  Loader2,
  Lock,
  Printer,
  RotateCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { EventGiftType } from "@prisma/client";
import type { PublicGiftCampaignView, PublicGiftPaymentView } from "@/lib/gifts/gift-privacy";
import {
  detectMethodFromPhone,
  listEnabledGiftPaymentMethods,
  type GiftPaymentMethodId,
} from "@/lib/gifts/gift-providers";
import { GiftNetworkLogo } from "@/components/gifts/gift-network-logo";
import {
  DEFAULT_MIN_AMOUNT_MINOR,
  DEFAULT_SUGGESTED_AMOUNTS_MINOR,
  GIFT_TYPE_LABELS,
  getGiftCopy,
} from "@/lib/gifts/gift-copy";
import { formatMinor, MoneyError, toMinorUnits } from "@/lib/gifts/money";
import { publicTokenFromGiftUrl } from "@/lib/gifts/gift-placement";
import styles from "./aurelia-editorial-wedding.module.css";

type MethodOption = {
  id: string;
  label: string;
  shortLabel: string;
};

type CheckoutPhase = "form" | "confirming" | "success" | "failed";

const GIFT_REF_KEY = "celeventic.invite-gift.ref";
const GIFT_FETCH_MS = 20000;

async function giftFetch(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), GIFT_FETCH_MS);
  try {
    return await fetch(input, {
      cache: "no-store",
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function payloadError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function giftReturnPath(fallback?: string | null): string | null {
  if (typeof window !== "undefined") {
    const { pathname, search } = window.location;
    if (pathname.startsWith("/invite/") || pathname.startsWith("/dev/")) {
      return `${pathname}${search}#aurelia-gifts`;
    }
  }
  return fallback ?? null;
}

function readGiftReference(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = (params.get("gift") || params.get("trxref") || params.get("reference") || "").trim();
  if (fromQuery) return fromQuery;
  try {
    return sessionStorage.getItem(GIFT_REF_KEY);
  } catch {
    return null;
  }
}

function rememberGiftReference(reference: string) {
  try {
    sessionStorage.setItem(GIFT_REF_KEY, reference);
  } catch {
    /* private mode */
  }
}

function forgetGiftReference() {
  try {
    sessionStorage.removeItem(GIFT_REF_KEY);
  } catch {
    /* private mode */
  }
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("gift");
  url.searchParams.delete("trxref");
  url.searchParams.delete("reference");
  const next = `${url.pathname}${url.search}#aurelia-gifts`;
  window.history.replaceState({}, "", next);
}

async function loadGiftPayment(reference: string): Promise<PublicGiftPaymentView | null> {
  const verify = await giftFetch("/api/gifts/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  if (verify.ok) {
    const payload = await verify.json().catch(() => ({}));
    return (payload.data as PublicGiftPaymentView) ?? null;
  }
  const status = await giftFetch(`/api/gifts/status/${encodeURIComponent(reference)}`);
  if (!status.ok) return null;
  const payload = await status.json().catch(() => ({}));
  return (payload.data as PublicGiftPaymentView) ?? null;
}

function invitePlacementQuery(input: {
  inviteLink?: string | null;
  eventId?: string | null;
  guestQrToken?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  const link = input.inviteLink?.trim();
  const eventId = input.eventId?.trim();
  if (link) params.set("link", link);
  else if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const invite = path.match(/^\/invite\/([^/]+)/);
    if (invite?.[1]) params.set("link", decodeURIComponent(invite[1]));
    const dev = path.match(/^\/dev\/([^/]+)/);
    if (dev?.[1]) params.set("link", `preview-${dev[1]}`);
  }
  if (eventId) params.set("eventId", eventId);
  if (input.guestQrToken?.trim()) params.set("g", input.guestQrToken.trim());
  return params;
}

type InvitePlacementPayload = {
  giftUrl?: string;
  qrImageUrl?: string | null;
  title?: string | null;
  ctaLabel?: string | null;
  privacyNote?: string | null;
  campaign?: PublicGiftCampaignView;
  methods?: MethodOption[];
};

async function loadInvitePlacement(query: URLSearchParams): Promise<InvitePlacementPayload | null> {
  if (!query.get("link") && !query.get("eventId")) return null;
  const res = await giftFetch(`/api/gifts/invite-placement?${query.toString()}`);
  const payload = await res.json().catch(() => ({}));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(payloadError(payload, "We could not open Paystack for this invitation."));
  return (payload.data as InvitePlacementPayload) ?? null;
}

export function AureliaGiftCheckout({
  giftUrl,
  giftQrImageUrl,
  giftTitle,
  giftSubtitle: _giftSubtitle,
  giftCtaLabel,
  giftPrivacyNote,
  guestQrToken,
  returnPath,
  detailsNote,
  eventId,
  inviteLink,
  collapsible = false,
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
  eventId?: string | null;
  inviteLink?: string | null;
  collapsible?: boolean;
}) {
  const [resolvedGiftUrl, setResolvedGiftUrl] = useState<string | null>(giftUrl ?? null);
  const [resolvedQrImageUrl, setResolvedQrImageUrl] = useState<string | null>(giftQrImageUrl ?? null);
  const token = useMemo(() => publicTokenFromGiftUrl(resolvedGiftUrl), [resolvedGiftUrl]);
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!collapsible);
  const [phase, setPhase] = useState<CheckoutPhase>("form");
  const [payment, setPayment] = useState<PublicGiftPaymentView | null>(null);
  const [checking, setChecking] = useState(false);
  const pollCount = useRef(0);
  const panelId = useId();

  useEffect(() => {
    if (giftUrl) setResolvedGiftUrl(giftUrl);
    if (giftQrImageUrl) setResolvedQrImageUrl(giftQrImageUrl);
  }, [giftUrl, giftQrImageUrl]);

  const applyPlacement = useCallback((data: InvitePlacementPayload) => {
    if (data.giftUrl) setResolvedGiftUrl(data.giftUrl);
    if (data.qrImageUrl) setResolvedQrImageUrl(data.qrImageUrl);
    if (data.campaign) setCampaign(data.campaign);
    if (Array.isArray(data.methods) && data.methods.length) {
      setMethods(data.methods.filter((item) => item.id !== "CARD"));
    }
  }, []);

  const bootstrapWallet = useCallback(async () => {
    const query = invitePlacementQuery({ inviteLink, eventId, guestQrToken });
    const data = await loadInvitePlacement(query);
    if (data) applyPlacement(data);
    return publicTokenFromGiftUrl(data?.giftUrl);
  }, [applyPlacement, eventId, guestQrToken, inviteLink]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const run = async () => {
      if (token) {
        if (campaign?.publicToken === token) return;
        const query = guestQrToken ? `?g=${encodeURIComponent(guestQrToken)}` : "";
        const res = await giftFetch(`/api/gifts/campaign/${encodeURIComponent(token)}${query}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "Gift wallet is not available.");
        if (cancelled) return;
        setCampaign(payload.data.campaign as PublicGiftCampaignView);
        if (Array.isArray(payload.data.methods) && payload.data.methods.length) {
          setMethods(payload.data.methods.filter((item: MethodOption) => item.id !== "CARD"));
        }
        return;
      }
      const nextToken = await bootstrapWallet();
      if (cancelled) return;
      if (!nextToken) return;
    };

    void run()
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, guestQrToken, bootstrapWallet]);

  useEffect(() => {
    if (!collapsible) return;
    const sync = () => {
      if (window.location.hash === "#aurelia-gifts") setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [collapsible]);

  const applyPayment = useCallback((view: PublicGiftPaymentView) => {
    setPayment(view);
    if (view.state === "success") {
      setPhase("success");
      setOpen(true);
      forgetGiftReference();
      return;
    }
    if (view.state === "failed") {
      setPhase("failed");
      setOpen(true);
      return;
    }
    setPhase("confirming");
    setOpen(true);
  }, []);

  useEffect(() => {
    const reference = readGiftReference();
    if (!reference) return;
    let cancelled = false;
    setPhase("confirming");
    setOpen(true);
    setChecking(true);
    void loadGiftPayment(reference)
      .then((view) => {
        if (cancelled) return;
        if (view) {
          applyPayment(view);
          return;
        }
        setPayment({
          reference,
          status: "FAILED",
          state: "failed",
          amountMinor: 0,
          currency: "GHS",
          giftType: "WEDDING_GIFT",
          createdAt: new Date().toISOString(),
          paidAt: null,
          method: null,
          guestName: null,
          isAnonymous: false,
          receiptUrl: null,
          companionReturnUrl: null,
          failureReason: "We could not find this gift. You can try sending it again.",
        });
        setPhase("failed");
        setOpen(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyPayment]);

  useEffect(() => {
    if (phase !== "confirming" || !payment?.reference) return;
    pollCount.current = 0;
    const timer = window.setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current > 40) {
        window.clearInterval(timer);
        return;
      }
      void loadGiftPayment(payment.reference).then((view) => {
        if (view) applyPayment(view);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [phase, payment?.reference, applyPayment]);

  const currency = campaign?.currency ?? "GHS";
  const suggested = campaign?.suggestedAmountsMinor?.length
    ? campaign.suggestedAmountsMinor
    : DEFAULT_SUGGESTED_AMOUNTS_MINOR;
  const minAmount = campaign?.minAmountMinor ?? DEFAULT_MIN_AMOUNT_MINOR;
  const maxAmount = campaign?.maxAmountMinor ?? null;
  const closed = campaign?.status === "CLOSED";
  const copy = getGiftCopy((campaign?.giftType as EventGiftType) || "WEDDING_GIFT");

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
    if (amountMinor === null || amountError || !method) return;
    if (campaign?.requireGuestName !== false && !guestName.trim()) {
      setError("Please tell the couple who the gift is from.");
      return;
    }
    if (campaign?.requireGuestContact !== false && !guestPhone.trim()) {
      setError("Please add a mobile money number for your receipt.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let publicToken = token;
      if (!publicToken) {
        publicToken = await bootstrapWallet().catch(() => null);
      }
      const placement = invitePlacementQuery({ inviteLink, eventId, guestQrToken });
      const res = await giftFetch("/api/gifts/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken: publicToken || undefined,
          inviteLink: placement.get("link") || undefined,
          eventId: placement.get("eventId") || undefined,
          amountMinor,
          method,
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          guestMessage: guestMessage.trim() || undefined,
          guestToken: guestQrToken || undefined,
          companionReturnUrl: giftReturnPath(returnPath) || undefined,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payloadError(payload, "We could not start this gift. Please try again."));
        setSubmitting(false);
        return;
      }
      const authorizationUrl = payload.data?.authorizationUrl as string | undefined;
      const reference = payload.data?.reference as string | undefined;
      if (reference) rememberGiftReference(reference);
      if (!authorizationUrl) {
        setError("We could not open Paystack checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(
        isAbortError(err)
          ? "Paystack took too long to respond. Please try again."
          : "Network problem. Please check your connection and try again."
      );
      setSubmitting(false);
    }
  }

  function resetToForm() {
    forgetGiftReference();
    setPayment(null);
    setPhase("form");
    setError(null);
    setSubmitting(false);
    setOpen(true);
  }

  const needsName = campaign?.requireGuestName !== false;
  const needsContact = campaign?.requireGuestContact !== false;
  const canPay = Boolean(
    amountMinor &&
      !amountError &&
      method &&
      !submitting &&
      !closed &&
      (!needsName || guestName.trim()) &&
      (!needsContact || guestPhone.trim())
  );
  const cta = giftCtaLabel || campaign?.ctaLabel || "Send a Cash Gift";
  const qrSrc =
    resolvedQrImageUrl ||
    giftQrImageUrl ||
    (resolvedGiftUrl ? `/api/qr/image?data=${encodeURIComponent(resolvedGiftUrl)}&size=512` : null);
  const outcome = phase !== "form";

  if (closed) {
    return (
      <div className={styles.giftCheckout}>
        {detailsNote ? <p className={styles.giftNote}>{detailsNote}</p> : null}
        <p className={styles.giftStatus}>{campaign?.closedReason || "Gifting has closed."}</p>
      </div>
    );
  }

  const form = (
    <div className={styles.giftPanel} id={panelId} aria-label={giftTitle || campaign?.title || "Send a cash gift"}>
      {loading ? (
        <p className={styles.giftStatus} aria-busy="true">
          Connecting to Paystack…
        </p>
      ) : null}
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
              placeholder="Enter your full name"
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

          <p className={styles.giftPrivacy}>
            <Lock size={12} aria-hidden />
            {giftPrivacyNote || campaign?.privacyNote || "Your gift is private."}
          </p>
          <p className={styles.giftPrivacy}>
            <ShieldCheck size={12} aria-hidden />
            Payments are processed securely by Paystack.
          </p>
    </div>
  );

  return (
    <div className={`${styles.giftCheckout}${collapsible && !open ? ` ${styles.giftCheckoutFolded}` : ""}`}>
      {detailsNote && phase === "form" ? <p className={styles.giftNote}>{detailsNote}</p> : null}
      {collapsible && phase === "form" ? (
        <button
          type="button"
          className={styles.giftToggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{open ? "Hide the gift form" : cta}</span>
          <ChevronDown
            size={18}
            className={open ? styles.giftChevronOpen : styles.giftChevron}
            aria-hidden
          />
        </button>
      ) : null}
      {open || outcome ? (
        <>
          {phase === "form" && qrSrc ? (
            <a
              className={styles.albumQr}
              href={resolvedGiftUrl || "#aurelia-gifts"}
              target={resolvedGiftUrl ? "_blank" : undefined}
              rel={resolvedGiftUrl ? "noopener noreferrer" : undefined}
              aria-label="Scan to send a cash gift"
            >
              <img src={qrSrc} alt="" width={512} height={512} decoding="async" />
              <p>Scan to send a cash gift</p>
            </a>
          ) : null}
          {phase === "form" ? form : null}
          {phase === "confirming" ? (
            <ConfirmingPanel
              payment={payment}
              checking={checking}
              onCheck={() => {
                if (!payment?.reference) return;
                setChecking(true);
                void loadGiftPayment(payment.reference)
                  .then((view) => {
                    if (view) applyPayment(view);
                  })
                  .finally(() => setChecking(false));
              }}
              onBack={resetToForm}
            />
          ) : null}
          {phase === "success" && payment ? (
            <SuccessPanel
              payment={payment}
              copy={copy}
              eventTitle={campaign?.event.title}
              hostName={campaign?.event.hostName}
              methods={methods}
            />
          ) : null}
          {phase === "failed" && payment ? (
            <FailedPanel payment={payment} onRetry={resetToForm} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ConfirmingPanel({
  payment,
  checking,
  onCheck,
  onBack,
}: {
  payment: PublicGiftPaymentView | null;
  checking: boolean;
  onCheck: () => void;
  onBack: () => void;
}) {
  return (
    <div className={styles.giftOutcome} role="status" aria-live="polite">
      <Loader2 className={styles.giftSpinLg} aria-hidden />
      <p className={styles.giftKicker}>Just a moment</p>
      <h3 className={styles.giftThankYou}>Confirming your gift</h3>
      <p className={styles.giftOutcomeCopy}>
        Approve any prompt on your phone if you have not already. We will show your
        receipt the moment Paystack confirms the payment.
      </p>
      {payment ? (
        <p className={styles.giftAmountHero}>
          {formatMinor(payment.amountMinor, payment.currency)}
        </p>
      ) : null}
      <button type="button" className={styles.giftSecondary} disabled={checking} onClick={onCheck}>
        <RotateCw size={15} aria-hidden />
        {checking ? "Checking…" : "Check again"}
      </button>
      <button type="button" className={styles.giftSecondary} onClick={onBack}>
        Back to the gift form
      </button>
    </div>
  );
}

function SuccessPanel({
  payment,
  copy,
  eventTitle,
  hostName,
  methods,
}: {
  payment: PublicGiftPaymentView;
  copy: ReturnType<typeof getGiftCopy>;
  eventTitle?: string;
  hostName?: string;
  methods: MethodOption[];
}) {
  const methodLabel =
    methods.find((item) => item.id === payment.method)?.label || payment.method || "Mobile money";
  const giftType =
    GIFT_TYPE_LABELS[(payment.giftType as EventGiftType) || "WEDDING_GIFT"] || "Gift";
  const paidAt = payment.paidAt || payment.createdAt;

  return (
    <div className={styles.giftOutcome} role="status" aria-live="polite">
      <span className={styles.giftSuccessMark} aria-hidden>
        <CheckCircle2 size={34} />
      </span>
      <p className={styles.giftKicker}>Received with love</p>
      <h3 className={styles.giftThankYou}>{copy.thankYouTitle}</h3>
      <p className={styles.giftOutcomeCopy}>{copy.thankYouMessage}</p>
      <p className={styles.giftAmountHero}>
        {formatMinor(payment.amountMinor, payment.currency)}
      </p>
      {(hostName || eventTitle) && (
        <p className={styles.giftOutcomeMeta}>
          {[hostName, eventTitle].filter(Boolean).join(" · ")}
        </p>
      )}
      <dl className={styles.giftReceipt}>
        <div>
          <dt>From</dt>
          <dd>{payment.isAnonymous ? "Anonymous" : payment.guestName || "A guest"}</dd>
        </div>
        <div>
          <dt>Gift</dt>
          <dd>{giftType}</dd>
        </div>
        <div>
          <dt>Paid with</dt>
          <dd>{methodLabel}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>
            {new Date(paidAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{payment.reference}</dd>
        </div>
      </dl>
      <div className={styles.giftOutcomeActions}>
        {payment.receiptUrl ? (
          <a className={styles.giftPay} href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
            <Printer size={15} aria-hidden />
            View full receipt
          </a>
        ) : (
          <button type="button" className={styles.giftPay} onClick={() => window.print()}>
            <Printer size={15} aria-hidden />
            Save or print
          </button>
        )}
      </div>
      <p className={styles.giftPrivacy}>
        <ShieldCheck size={12} aria-hidden />
        This confirmation is private to you.
      </p>
    </div>
  );
}

function FailedPanel({
  payment,
  onRetry,
}: {
  payment: PublicGiftPaymentView;
  onRetry: () => void;
}) {
  const mismatch = payment.failureReason?.toLowerCase().includes("mismatch");
  return (
    <div className={styles.giftOutcome} role="alert">
      <span className={styles.giftFailedMark} aria-hidden>
        <XCircle size={34} />
      </span>
      <p className={styles.giftKicker}>Still with you</p>
      <h3 className={styles.giftThankYou}>This gift did not go through</h3>
      <p className={styles.giftOutcomeCopy}>
        {mismatch
          ? "We could not safely confirm this payment. Please try again, or use a different number."
          : "No successful payment was recorded, so nothing was taken. You may try again whenever you are ready."}
      </p>
      {payment.amountMinor ? (
        <p className={styles.giftOutcomeMeta}>
          {formatMinor(payment.amountMinor, payment.currency)} · {payment.reference}
        </p>
      ) : null}
      <button type="button" className={styles.giftPay} onClick={onRetry}>
        <RotateCw size={15} aria-hidden />
        Try again
      </button>
    </div>
  );
}
