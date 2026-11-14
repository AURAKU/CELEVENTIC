"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { Check, Copy, Download, Lock, Mail, Phone, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { DigitalCardSmartLink } from "@/components/digital-business-card/digital-card-smart-link";
import { CeleCardStageField } from "@/components/digital-business-card/digital-card-atmosphere";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { digitalCardIdentityUrl, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import {
  CELECARD_REACH_INK,
  celecardActionOnWell,
  celecardCtaOnPaper,
  celecardTypeVoice,
} from "@/lib/digital-business-card/type-voice";
import {
  bankAccountDisplayRows,
  groupDigitalCardPayItems,
  listDigitalCardPayItems,
  parseBankAccount,
  type DigitalCardPayFamilyGroup,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";
import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";
import {
  celecardPortraitFrameClass,
  resolveCeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import {
  DigitalCardContinuityView,
  DigitalCardUnavailableView,
} from "@/components/digital-business-card/digital-card-continuity-view";
import { digitalCardWalletPath } from "@/lib/digital-business-card/share";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import {
  formatWalletPaymentBundle,
  isVerifiedPayAppHref,
} from "@/lib/digital-business-card/wallet-quality";
import { shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";

const PAY_SHOW_ORDER = ["scan", "mobile-money", "send-a-link", "payment-links", "bank"] as const;

const WELL = {
  background: "#fffef8",
  color: "#1c1917",
  border: "rgba(28,25,23,0.10)",
} as const;

function familyHintKey(id: string) {
  if (id === "scan") return "celeyou.hint_scan";
  if (id === "mobile-money") return "celeyou.hint_mobile-money";
  if (id === "bank") return "celeyou.hint_bank";
  if (id === "payment-links") return "celeyou.hint_payment-links";
  return "celeyou.hint_send-a-link";
}

function familyLabelKey(id: string) {
  if (id === "scan") return "celeyou.family_scan";
  if (id === "mobile-money") return "celeyou.family_mobile-money";
  if (id === "bank") return "celeyou.family_bank";
  if (id === "payment-links") return "celeyou.family_payment-links";
  if (id === "send-a-link") return "celeyou.family_send-a-link";
  return "celeyou.channels";
}

function bankFieldKey(label: string) {
  if (label === "Bank name") return "celeyou.field_bank_name";
  if (label === "Account name") return "celeyou.field_account_name";
  if (label === "Account number") return "celeyou.field_account_number";
  if (label === "Account type") return "celeyou.field_account_type";
  return "";
}

function bankTypeValue(t: (key: string) => string, value: string) {
  if (value === "Savings") return t("celeyou.bank_type_savings");
  if (value === "Current") return t("celeyou.bank_type_current");
  if (value === "Checking") return t("celeyou.bank_type_checking");
  if (value === "Business") return t("celeyou.bank_type_business");
  if (value === "Other") return t("celeyou.bank_type_other");
  return value;
}

function unlockErrorKey(message: string) {
  if (message.includes("four-character") || message.includes("Enter a four")) return "celeyou.code_length";
  if (message.includes("Too many")) return "celeyou.too_many";
  if (message.includes("did not unlock") || message.includes("does not unveil")) return "celeyou.unlock_failed";
  return "celeyou.unlock_error";
}

function payCopyText(item: DigitalCardReachItem) {
  if (item.brand === "bank") {
    return bankAccountDisplayRows(parseBankAccount(item.copyValue))
      .map((row) => `${row.label}: ${row.value}`)
      .join("\n");
  }
  return item.copyValue?.trim() || "";
}

function sortPayFamilies(families: DigitalCardPayFamilyGroup[]) {
  return [...families].sort((a, b) => {
    const left = PAY_SHOW_ORDER.indexOf(a.id as (typeof PAY_SHOW_ORDER)[number]);
    const right = PAY_SHOW_ORDER.indexOf(b.id as (typeof PAY_SHOW_ORDER)[number]);
    return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
  });
}

async function savePayQr(item: DigitalCardReachItem) {
  if (!item.qrUrl) return;
  try {
    const res = await fetch(item.qrUrl, { cache: "no-store", credentials: "omit" });
    if (!res.ok) throw new Error("qr");
    const blob = await res.blob();
    const file = new File([blob], `${item.title.replace(/\s+/g, "-")}-pay-qr.png`, {
      type: blob.type || "image/png",
    });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: item.title, text: `Pay with ${item.title}` });
      return;
    }
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(href);
  } catch {
    window.open(item.qrUrl, "_blank", "noopener,noreferrer");
  }
}

function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  accent?: string;
}) {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  if (!value) return null;
  const doneLabel = copiedLabel || t("celeyou.copied_check");
  const live =
    state === "copied" ? doneLabel : state === "failed" ? t("celeyou.copy_failed_live") : "";
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(value);
        setState(ok ? "copied" : "failed");
        window.setTimeout(() => setState("idle"), 1800);
      }}
      className="celeyou-btn celeyou-btn-copy inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
      data-copied={state === "copied" ? "true" : "false"}
      style={{ background: CELECARD_REACH_INK, color: "#fffef8" }}
    >
      {state === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {state === "copied" ? doneLabel : state === "failed" ? t("celeyou.copy_failed") : label}
      <span className="sr-only" aria-live="polite">
        {live}
      </span>
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent: string;
}) {
  const well = celecardActionOnWell();
  return (
    <button
      type="button"
      onClick={onClick}
      className="celeyou-btn celeyou-btn-ghost inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold"
      style={well}
    >
      {children}
    </button>
  );
}

function WalletUnlock({
  slug,
  item,
  contact,
}: {
  slug: string;
  item: DigitalCardReachItem;
  contact: { phone: string | null; email: string | null };
}) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const needsCode = item.visibility === "CODE_PROTECTED";
  const errorId = `wallet-unlock-error-${item.id}`;

  async function unlock() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t("celeyou.empty_code"));
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length < 4) {
      setError(t("celeyou.code_length"));
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, itemKey: item.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(t(unlockErrorKey(String(json?.error || ""))));
        inputRef.current?.focus();
        return;
      }
      window.location.reload();
    } catch {
      setError(t("celeyou.unlock_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="celeyou-locked-card mt-3 space-y-3">
      <p className="text-sm leading-relaxed" style={{ color: "#3f3a36" }}>
        {t("celeyou.locked_guidance", { title: item.title })}
      </p>
      {needsCode ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void unlock();
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-[0.14em]" htmlFor={`wallet-code-${item.id}`}>
            {t("celeyou.access_code")}
          </label>
          <input
            ref={inputRef}
            id={`wallet-code-${item.id}`}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError(null);
            }}
            placeholder={t("celeyou.enter_code")}
            autoComplete="one-time-code"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="celeyou-input min-h-11 min-w-0 rounded-2xl border bg-white px-4 text-sm outline-none"
            style={{ borderColor: error ? "#b45309" : "rgba(28,25,23,0.16)", color: WELL.color }}
          />
          <button
            type="submit"
            disabled={busy}
            className="celeyou-btn celeyou-btn-primary inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            style={celecardCtaOnPaper("#0B8A83", WELL.background)}
          >
            {busy ? t("celeyou.unlocking") : t("celeyou.unlock")}
          </button>
        </form>
      ) : (
        <p className="text-sm" style={{ color: "#3f3a36" }}>
          {t("celeyou.ask_cardholder")}
        </p>
      )}
      {error ? (
        <p id={errorId} className="text-sm text-amber-800" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {contact.phone ? (
          <a
            href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
            style={celecardActionOnWell()}
          >
            <Phone className="h-4 w-4" />
            {t("celeyou.call_recipient")}
          </a>
        ) : null}
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
            style={celecardActionOnWell()}
          >
            <Mail className="h-4 w-4" />
            {t("celeyou.email_recipient")}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function CopyFieldButton({ value, label }: { value: string; label: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className="celecard-copy-hit min-h-11 min-w-11"
      data-copied={state === "copied" ? "true" : "false"}
      aria-label={state === "copied" ? t("celeyou.copied_named", { label }) : t("celeyou.copy_named", { label })}
      onClick={async () => {
        const ok = await copyText(value);
        setState(ok ? "copied" : "failed");
        window.setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? t("celeyou.copied_check") : state === "failed" ? t("celeyou.could_not_copy") : ""}
      </span>
    </button>
  );
}

function PayChannelCard({
  item,
  familyId,
  slug,
  accent,
  walletUrl,
  ownerName,
  contact,
}: {
  item: DigitalCardReachItem;
  familyId: string;
  slug: string;
  accent: string;
  accentSoft: string;
  walletUrl: string;
  ownerName: string;
  contact: { phone: string | null; email: string | null };
}) {
  const { t } = useLocale();
  const bank = item.brand === "bank" ? parseBankAccount(item.copyValue) : null;
  const bankRows = bank ? bankAccountDisplayRows(bank) : [];
  const itemCopy = payCopyText(item);
  const showQr = Boolean(item.qrUrl) && !item.locked;
  const number = familyId === "mobile-money" ? item.copyValue?.trim() || "" : "";
  const accountName =
    familyId === "mobile-money" && item.subtitle?.trim() && item.subtitle.trim() !== number
      ? item.subtitle.trim()
      : null;
  const canOpenPayApp = !item.locked && isVerifiedPayAppHref(item.href);

  async function shareQr() {
    trackCeleYouGuestEvent(slug, "share_tap");
    await shareCeleYouProfile({
      title: t("celeyou.pay_name", { name: ownerName }),
      text: t("celeyou.share_pay_text", { name: ownerName }),
      url: walletUrl,
      imageUrl: item.qrUrl || null,
      capturePlate: false,
      includeUrlInText: false,
    });
  }

  return (
    <article
      className="celeyou-pay-card rounded-[1.45rem] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
      style={{ background: WELL.background, borderColor: WELL.border, color: WELL.color }}
    >
      <div className="flex items-center gap-3">
        <DigitalCardBrandMark id={item.brand} className="h-12 w-12 shrink-0 rounded-[14px]" />
        <div className="min-w-0">
          <p className="truncate text-[1.05rem] font-semibold tracking-tight">{item.title}</p>
          {item.locked ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm" style={{ color: "#3f3a36" }}>
              <Lock className="h-3.5 w-3.5" />
              {t("celeyou.locked")}
            </p>
          ) : number ? (
            <>
              {accountName ? (
                <p className="mt-0.5 truncate text-sm" style={{ color: "#3f3a36" }}>
                  {accountName}
                </p>
              ) : null}
              <p className="mt-0.5 select-all font-mono text-[1.15rem] font-semibold tracking-wide">{number}</p>
            </>
          ) : item.subtitle && familyId !== "scan" && familyId !== "bank" ? (
            <p className="mt-0.5 truncate text-sm" style={{ color: "#3f3a36" }}>
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {item.locked ? <WalletUnlock slug={slug} item={item} contact={contact} /> : null}

      {!item.locked && familyId === "mobile-money" && number ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "#3f3a36" }}>
          {t("celeyou.momo_instruction")}
        </p>
      ) : null}

      {!item.locked && bankRows.length ? (
        <dl className="celecard-copy-list mt-4 grid gap-0 rounded-2xl bg-white px-2 py-1.5">
          {bankRows.map((row) => (
            <div key={row.label} className="celecard-copy-row">
              <div className="min-w-0 flex-1">
                <dt className="celecard-copy-label">{t(bankFieldKey(row.label) || "celeyou.copy_details")}</dt>
                <dd className="celecard-copy-value select-all">{row.label === "Account type" ? bankTypeValue(t, row.value) : row.value}</dd>
              </div>
              <CopyFieldButton value={row.value} label={t(bankFieldKey(row.label) || "celeyou.copy_details")} />
            </div>
          ))}
        </dl>
      ) : null}

      {showQr ? (
        <div className="mt-4 overflow-hidden rounded-[1.2rem] bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.qrUrl}
            alt={`${item.title} receive QR`}
            className="mx-auto h-52 w-52 object-contain sm:h-56 sm:w-56"
          />
        </div>
      ) : null}

      {!item.locked ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {itemCopy ? (
            <CopyButton
              value={itemCopy}
              label={
                familyId === "bank"
                  ? t("celeyou.copy_all")
                  : familyId === "mobile-money"
                    ? t("celeyou.copy_number")
                    : t("celeyou.copy_details")
              }
              copiedLabel={t("celeyou.copied_check")}
            />
          ) : null}
          {canOpenPayApp ? (
            <DigitalCardSmartLink
              item={item}
              className="celeyou-btn celeyou-btn-pay inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
              style={{ background: CELECARD_REACH_INK, color: "#fffef8" }}
              onActivate={() => trackCeleYouGuestEvent(slug, "share_tap")}
            >
              {t("celeyou.open_title", { title: item.title })}
            </DigitalCardSmartLink>
          ) : null}
          {showQr ? (
            <>
              <GhostButton accent={accent} onClick={() => void savePayQr(item)}>
                <Download className="h-4 w-4" />
                {t("celeyou.save_qr")}
              </GhostButton>
              <GhostButton accent={accent} onClick={() => void shareQr()}>
                <Share2 className="h-4 w-4" />
                {t("celeyou.share_qr")}
              </GhostButton>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function DigitalCardWalletView({
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
  const profileUrl = digitalCardIdentityUrl(card.slug, origin);
  const walletUrl = `${origin.replace(/\/$/, "")}${digitalCardWalletPath(card.slug)}`;
  const families = useMemo(
    () => sortPayFamilies(groupDigitalCardPayItems(listDigitalCardPayItems(card))),
    [card]
  );
  const frame = resolveCeleCardPortraitFrame(theme, card.socials.portraitFrame);
  const photo = isCeleCardPhotoUrl(card.avatarUrl);
  const roleLine = [card.title, card.company].filter(Boolean).join(" · ");
  const paper = theme.cardBackground || "#0B8A83";
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const allCopy = formatWalletPaymentBundle(families);
  const firstQr = families.flatMap((family) => family.items).find((item) => item.qrUrl && !item.locked)?.qrUrl;
  const publicContact = { phone: card.phone ?? null, email: card.email ?? null };
  const shareCta = celecardCtaOnPaper(theme.accent, paper);
  const stageHex = theme.stageBackground.match(/#([0-9a-fA-F]{6})/)?.[1] ?? "1a1410";
  const darkStage =
    (parseInt(stageHex.slice(0, 2), 16) * 299 +
      parseInt(stageHex.slice(2, 4), 16) * 587 +
      parseInt(stageHex.slice(4, 6), 16) * 114) /
      1000 <
    140;

  if (card.presentationMode === "courtesy") {
    return <DigitalCardContinuityView card={card} />;
  }
  if (card.presentationMode && card.presentationMode !== "live") {
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  async function sharePayPage() {
    trackCeleYouGuestEvent(card.slug, "share_tap");
    const result = await shareCeleYouProfile({
      title: t("celeyou.pay_name", { name: card.displayName }),
      text: t("celeyou.share_pay_text", { name: card.displayName }),
      url: walletUrl,
      imageUrl: firstQr || null,
      capturePlate: false,
      includeUrlInText: false,
    });
    setShareState(result === "copied" ? "copied" : result === "shared" ? "shared" : result === "unavailable" ? "failed" : "idle");
    window.setTimeout(() => setShareState("idle"), 1800);
  }

  return (
    <main
      className="celecard-stage relative min-h-app-viewport overflow-x-hidden px-5 pb-16 pt-16 sm:pt-20"
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      data-celecard-stage={darkStage ? "dark" : "light"}
      style={{
        background: theme.stageBackground,
        ["--celecard-accent" as string]: theme.accent,
        ["--celecard-stage-light" as string]: darkStage ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.78)",
        ["--celecard-stage-shade" as string]: darkStage ? "rgba(0,0,0,0.46)" : "rgba(15,23,42,0.12)",
      }}
    >
      <CeleCardStageField />
        <div
        className="celecard-wallet-shell relative z-10 isolate flex w-full flex-col gap-5 rounded-[1.85rem] border px-5 py-6 shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
        style={{ background: paper, borderColor: theme.border, color: theme.text }}
      >
        <header className="flex items-center gap-3.5">
          {photo ? (
            <img
              src={card.avatarUrl ?? ""}
              alt={card.displayName}
              className={cn("h-14 w-14 shrink-0 object-cover", celecardPortraitFrameClass(frame))}
            />
          ) : (
            <div role="img" aria-label={card.displayName}>
              <DigitalCardHouseAvatar
                theme={theme}
                avatarUrl={card.avatarUrl}
                className="h-14 w-14"
                framed={false}
                rounded={frame === "circle" ? "full" : frame === "rounded" ? "lg" : "none"}
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
              {SMARTCARD_PRODUCT_SHORT_NAME}
            </p>
            <h1
              className="truncate text-[1.35rem] font-semibold tracking-tight"
              style={{ color: theme.text, fontFamily: typeVoice.heading }}
            >
              {t("celeyou.pay_name", { name: card.displayName })}
            </h1>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.muted }}>
              {SMARTCARD_BRAND_TAGLINE}
            </p>
            {roleLine ? (
              <p className="mt-0.5 truncate text-sm" style={{ color: theme.muted, fontFamily: typeVoice.title }}>
                {roleLine}
              </p>
            ) : null}
          </div>
        </header>

        <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
          {t("celeyou.wallet_intro")}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void sharePayPage()}
            className="celeyou-btn celeyou-btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
            style={shareCta}
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {shareState === "copied"
              ? t("celeyou.copied_check")
              : shareState === "shared"
                ? t("celeyou.shared")
                : shareState === "failed"
                  ? t("celeyou.share_failed")
                  : t("celeyou.share_pay_page")}
            <span className="sr-only" aria-live="polite">
              {shareState === "copied"
                ? t("celeyou.copied_check")
                : shareState === "failed"
                  ? t("celeyou.could_not_share")
                  : ""}
            </span>
          </button>
          {allCopy ? (
            <CopyButton value={allCopy} label={t("celeyou.copy_all")} accent={theme.accent} />
          ) : null}
        </div>

        {families.length ? (
          <div className="space-y-6" aria-label={t("celeyou.channels")}>
            {families.map((family) => (
              <section key={family.id} className="space-y-2.5" aria-labelledby={`pay-${family.id}`}>
                <div>
                  <h2
                    id={`pay-${family.id}`}
                    className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: theme.muted }}
                  >
                    {t(familyLabelKey(family.id))}
                  </h2>
                  <p className="mt-1 px-0.5 text-sm" style={{ color: theme.muted }}>
                    {t(familyHintKey(family.id))}
                  </p>
                </div>
                <div className="space-y-3">
                  {family.items.map((item) => (
                    <PayChannelCard
                      key={item.id}
                      item={item}
                      familyId={family.id}
                      slug={card.slug}
                      accent={theme.accent}
                      accentSoft={theme.accentSoft}
                      walletUrl={walletUrl}
                      ownerName={card.displayName}
                      contact={publicContact}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
            {t("celeyou.no_wallets")}
          </p>
        )}

        <Link
          href={profileUrl}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap text-sm font-semibold"
          style={{ color: theme.accent }}
        >
          {t("celeyou.open_profile")}
        </Link>
      </div>
    </main>
  );
}
