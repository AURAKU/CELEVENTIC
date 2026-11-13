"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Lock, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalCardHouseAvatar } from "@/components/digital-business-card/digital-card-house-avatar";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { DigitalCardSmartLink } from "@/components/digital-business-card/digital-card-smart-link";
import { celecardMotionMood, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign } from "@/lib/digital-business-card/design";
import { digitalCardIdentityUrl, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { CELECARD_REACH_INK, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import {
  bankAccountDisplayRows,
  formatBankAccountCopy,
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
import { celeCardShareMessage, digitalCardWalletPath } from "@/lib/digital-business-card/share";
import { shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";

const PAY_SHOW_ORDER = ["scan", "mobile-money", "send-a-link", "payment-links", "bank"] as const;

const WELL = {
  background: "#fffef8",
  color: "#1c1917",
  border: "rgba(28,25,23,0.10)",
} as const;

function familyHint(id: string) {
  if (id === "scan") return "Hold this QR to their camera, or save it.";
  if (id === "mobile-money") return "Copy the number, then send from your wallet.";
  if (id === "bank") return "Copy the account and send from your bank.";
  if (id === "payment-links") return "Opens the payment page on this phone.";
  return "Opens their pay page on this phone.";
}

function payCopyText(item: DigitalCardReachItem) {
  if (item.brand === "bank") {
    const bank = parseBankAccount(item.copyValue);
    return formatBankAccountCopy(bank);
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
  copiedLabel = "Copied",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  accent?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard may be blocked in some browsers */
        }
      }}
      className="celecard-copy-all inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
      data-copied={copied ? "true" : "false"}
      style={{ background: CELECARD_REACH_INK, color: "#fffef8" }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold"
      style={{ borderColor: "rgba(28,25,23,0.14)", color: accent, background: "transparent" }}
    >
      {children}
    </button>
  );
}

function WalletUnlock({ slug, item }: { slug: string; item: DigitalCardReachItem }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsCode = item.visibility === "CODE_PROTECTED";

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/public/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "That code did not unlock this channel.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not unlock this channel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {needsCode ? (
        <form
          className="flex overflow-hidden rounded-full border"
          style={{ borderColor: "rgba(28,25,23,0.14)" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) void unlock();
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Access code"
            aria-label={`Access code for ${item.title}`}
            className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
          />
          <button type="submit" disabled={busy} className="px-4 text-sm font-semibold text-[#0B8A83]">
            Unlock
          </button>
        </form>
      ) : (
        <p className="text-sm" style={{ color: "#3f3a36" }}>
          Ask them to share this channel with you.
        </p>
      )}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
    </div>
  );
}

function CopyFieldButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="celecard-copy-hit"
      data-copied={copied ? "true" : "false"}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard may be blocked in some browsers */
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function PayChannelCard({
  item,
  familyId,
  slug,
  accent,
  accentSoft,
  walletUrl,
  ownerName,
}: {
  item: DigitalCardReachItem;
  familyId: string;
  slug: string;
  accent: string;
  accentSoft: string;
  walletUrl: string;
  ownerName: string;
}) {
  const bank = item.brand === "bank" ? parseBankAccount(item.copyValue) : null;
  const bankRows = bank ? bankAccountDisplayRows(bank) : [];
  const copyText = payCopyText(item);
  const showQr = Boolean(item.qrUrl) && !item.locked;
  const number = familyId === "mobile-money" ? item.copyValue?.trim() || item.subtitle : null;

  async function shareQr() {
    trackCeleYouGuestEvent(slug, "share_tap");
    await shareCeleYouProfile({
      title: `Pay ${ownerName} with ${item.title}`,
      text: `Pay ${ownerName} with ${item.title}`,
      url: walletUrl,
      imageUrl: item.qrUrl || null,
    });
  }

  return (
    <article
      className="rounded-[1.45rem] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
      style={{ background: WELL.background, borderColor: WELL.border, color: WELL.color }}
    >
      <div className="flex items-center gap-3">
        <DigitalCardBrandMark id={item.brand} className="h-12 w-12 shrink-0 rounded-[14px]" />
        <div className="min-w-0">
          <p className="truncate text-[1.05rem] font-semibold tracking-tight">{item.title}</p>
          {item.locked ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm" style={{ color: "#3f3a36" }}>
              <Lock className="h-3.5 w-3.5" />
              Locked on this CeleYou
            </p>
          ) : number ? (
            <p className="mt-0.5 select-all font-mono text-[1.15rem] font-semibold tracking-wide">{number}</p>
          ) : item.subtitle && familyId !== "scan" ? (
            <p className="mt-0.5 truncate text-sm" style={{ color: "#3f3a36" }}>
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {item.locked ? <WalletUnlock slug={slug} item={item} /> : null}

      {!item.locked && bankRows.length ? (
        <dl className="celecard-copy-list mt-4 grid gap-0 rounded-2xl bg-white px-2 py-1.5">
          {bankRows.map((row) => (
            <div key={row.label} className="celecard-copy-row">
              <div className="min-w-0 flex-1">
                <dt className="celecard-copy-label">{row.label}</dt>
                <dd className="celecard-copy-value select-all">{row.value}</dd>
              </div>
              <CopyFieldButton value={row.value} label={row.label} />
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
          {copyText ? (
            <CopyButton
              value={copyText}
              label={familyId === "bank" ? "Copy all" : familyId === "mobile-money" ? "Copy number" : "Copy details"}
              copiedLabel={familyId === "bank" ? "Copied all" : "Copied"}
            />
          ) : null}
          {item.href ? (
            <DigitalCardSmartLink
              item={item}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
              style={{ background: accentSoft, color: accent }}
              onActivate={() => trackCeleYouGuestEvent(slug, "share_tap")}
            >
              Open {item.title}
            </DigitalCardSmartLink>
          ) : null}
          {showQr ? (
            <>
              <GhostButton accent={accent} onClick={() => void savePayQr(item)}>
                <Download className="h-4 w-4" />
                Save QR
              </GhostButton>
              <GhostButton accent={accent} onClick={() => void shareQr()}>
                <Share2 className="h-4 w-4" />
                Share QR
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
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied">("idle");
  const allCopy = families
    .flatMap((family) => family.items.filter((item) => !item.locked).map(payCopyText))
    .filter(Boolean)
    .join("\n\n");
  const firstQr = families.flatMap((family) => family.items).find((item) => item.qrUrl && !item.locked)?.qrUrl;

  if (card.presentationMode === "courtesy") {
    return <DigitalCardContinuityView card={card} />;
  }
  if (card.presentationMode && card.presentationMode !== "live") {
    return <DigitalCardUnavailableView mode={card.presentationMode} />;
  }

  async function sharePayPage() {
    trackCeleYouGuestEvent(card.slug, "share_tap");
    const result = await shareCeleYouProfile({
      title: `Pay ${card.displayName}`,
      text: celeCardShareMessage({ displayName: card.displayName }, walletUrl),
      url: walletUrl,
      imageUrl: firstQr || null,
    });
    setShareState(result === "copied" ? "copied" : result === "shared" ? "shared" : "idle");
    window.setTimeout(() => setShareState("idle"), 1800);
  }

  return (
    <main
      className="celecard-stage relative min-h-app-viewport overflow-x-hidden px-5 pb-16 pt-16 sm:pt-20"
      data-celecard-mood={motionMood}
      data-celecard-guest=""
      style={{ background: theme.stageBackground }}
    >
        <div
        className="celecard-wallet-shell relative z-10 isolate flex w-full flex-col gap-5 rounded-[1.85rem] border px-5 py-6 shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
        style={{ background: paper, borderColor: theme.border, color: theme.text }}
      >
        <header className="flex items-center gap-3.5">
          {photo ? (
            <img
              src={card.avatarUrl ?? ""}
              alt=""
              className={cn("h-14 w-14 shrink-0 object-cover", celecardPortraitFrameClass(frame))}
            />
          ) : (
            <DigitalCardHouseAvatar
              theme={theme}
              avatarUrl={card.avatarUrl}
              className="h-14 w-14"
              framed={false}
              rounded={frame === "circle" ? "full" : frame === "rounded" ? "lg" : "none"}
            />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
              Payment channels
            </p>
            <h1
              className="truncate text-[1.35rem] font-semibold tracking-tight"
              style={{ color: theme.text, fontFamily: typeVoice.heading }}
            >
              Pay {card.displayName}
            </h1>
            {roleLine ? (
              <p className="mt-0.5 truncate text-sm" style={{ color: theme.muted, fontFamily: typeVoice.title }}>
                {roleLine}
              </p>
            ) : null}
          </div>
        </header>

        <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
          Show this screen or share the link. Guests copy a number, scan a QR, or open a wallet.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void sharePayPage()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
            style={{ background: theme.accent, color: "#fffef8" }}
          >
            <Share2 className="h-4 w-4" />
            {shareState === "copied" ? "Link copied" : shareState === "shared" ? "Shared" : "Share pay page"}
          </button>
          {allCopy ? (
            <CopyButton value={allCopy} label="Copy all" accent={theme.accent} />
          ) : null}
        </div>

        {families.length ? (
          <div className="space-y-6" aria-label="Payment channels">
            {families.map((family) => (
              <section key={family.id} className="space-y-2.5" aria-labelledby={`pay-${family.id}`}>
                <div>
                  <h2
                    id={`pay-${family.id}`}
                    className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: theme.muted }}
                  >
                    {family.label}
                  </h2>
                  <p className="mt-1 px-0.5 text-sm" style={{ color: theme.muted }}>
                    {familyHint(family.id)}
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
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>
            No wallets or bank details are on this CeleYou yet.
          </p>
        )}

        <Link
          href={profileUrl}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap text-sm font-semibold"
          style={{ color: theme.accent }}
        >
          Open public profile
        </Link>
      </div>
    </main>
  );
}
