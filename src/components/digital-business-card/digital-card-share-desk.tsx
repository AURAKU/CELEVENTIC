"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contact, Copy, CreditCard, Nfc, Share2, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { writeCeleCardNfcUrl } from "@/lib/digital-business-card/nfc-write";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import { CeleYouNameDropSetup } from "@/components/digital-business-card/celeyou-namedrop-setup";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { celeCardShareMessage, celeCardShareTitle, digitalCardWalletPath } from "@/lib/digital-business-card/share";
import { getCeleYouShareOrigin, sanitizePublicUrl } from "@/lib/app-url";
import { TAP_STUDIO_PATH } from "@/lib/celeyou-proximity/product";
import {
  CeleYouSmartShareEngine,
  COPY_PROFILE_LINK_CTA,
  SAVE_CONTACT_CTA,
  SHARE_MY_CARD_CTA,
  SHARE_MY_CELEYOU,
} from "@/lib/celeyou-share/engine";
import { contactSaveHint } from "@/lib/celeyou-share/namedrop";
import { WALLET_PASS_CTA } from "@/lib/celeyou-share/wallet-pass";

export function DigitalCardShareDesk({
  profileUrl,
  presentUrl,
  shareUrl,
  nfcUrl,
  displayName,
  vcard,
  cardId,
  proximityDiscoverable = true,
  onProximityChange,
}: {
  profileUrl: string;
  presentUrl: string;
  shareUrl: string;
  nfcUrl: string;
  displayName: string;
  vcard: DigitalCardPublicPayload;
  cardId?: string;
  proximityDiscoverable?: boolean;
  onProximityChange?: (value: boolean) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);
  const [nfcBusy, setNfcBusy] = useState(false);
  const [discoverable, setDiscoverable] = useState(proximityDiscoverable);
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    setDiscoverable(proximityDiscoverable);
  }, [proximityDiscoverable]);
  const nfc = useMemo(() => detectNfcWriteSupport(), []);
  const engine = useMemo(() => new CeleYouSmartShareEngine(), []);
  const origin = getCeleYouShareOrigin();
  const publicShare = sanitizePublicUrl(shareUrl || profileUrl, origin);
  const identityShare = sanitizePublicUrl(
    profileUrl.startsWith("http")
      ? profileUrl
      : profileUrl.startsWith("/")
        ? `${origin.replace(/\/$/, "")}${profileUrl}`
        : publicShare,
    origin
  );
  const publicNfc = sanitizePublicUrl(nfcUrl || shareUrl || profileUrl, origin);

  async function copy(label: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  function saveContact() {
    void saveDigitalCardContact(vcard, { origin, source: "owner" }).then((result) => {
      if (result === "opened" || result === "downloaded" || result === "shared") {
        setShareNote(contactSaveHint(engine.capability.platform));
      }
      window.setTimeout(() => setShareNote(null), 8000);
    });
  }

  async function writeTag() {
    setNfcBusy(true);
    setNfcMessage(null);
    const result = await writeCeleCardNfcUrl(publicNfc);
    setNfcBusy(false);
    setNfcMessage(result.ok ? "Tag written. The tag opens this CeleYou." : result.reason);
  }

  async function shareProfile() {
    const result = await engine.share({
      title: celeCardShareTitle({ displayName: vcard.displayName, title: vcard.title }),
      text: celeCardShareMessage({ displayName: vcard.displayName }),
      url: identityShare,
    });
    if (result === "copied") {
      setShareNote("Link copied.");
    } else if (result === "unavailable") {
      await copy("link", identityShare);
      setShareNote("Link copied.");
    } else {
      setShareNote(null);
    }
    window.setTimeout(() => setShareNote(null), 6000);
  }

  const ready = Boolean(identityShare || publicShare);
  const immersivePresent = presentUrl.includes("immersive=1")
    ? presentUrl
    : `${presentUrl}${presentUrl.includes("?") ? "&" : "?"}immersive=1`;

  async function toggleDiscoverable() {
    if (!cardId || discoverBusy) return;
    const next = !discoverable;
    setDiscoverBusy(true);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proximityDiscoverable: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setNfcMessage(typeof json.error === "string" ? json.error : "Could not update Tap-to-Connect.");
        return;
      }
      setDiscoverable(next);
      onProximityChange?.(next);
    } catch {
      setNfcMessage("Could not update Tap-to-Connect.");
    } finally {
      setDiscoverBusy(false);
    }
  }

  return (
    <div id="share" className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">{SHARE_MY_CELEYOU}</p>
      <p className="text-xs font-medium text-slate-800">{displayName}</p>

      <Button
        type="button"
        disabled={!ready}
        className="w-full bg-[#0B8A83] text-white hover:bg-[#0B8A83]/90"
        onClick={() => void shareProfile()}
      >
        <Share2 className="mr-2 h-4 w-4" />
        {SHARE_MY_CARD_CTA}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={() => void copy("link", identityShare)}>
          <Copy className="mr-2 h-4 w-4" />
          {copied === "link" ? "Copied" : COPY_PROFILE_LINK_CTA}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={saveContact}>
          <Contact className="mr-2 h-4 w-4" />
          {SAVE_CONTACT_CTA}
        </Button>
        {vcard.slug ? (
          <Button asChild variant="outline" size="sm">
            <Link href={digitalCardWalletPath(vcard.slug)}>
              <WalletCards className="mr-2 h-4 w-4" />
              {WALLET_PASS_CTA}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm" disabled={!ready}>
          <Link href={immersivePresent}>
            <CreditCard className="mr-2 h-4 w-4" />
            Hold up this card
          </Link>
        </Button>
      </div>
      {shareNote ? <p className="text-xs leading-relaxed text-slate-700">{shareNote}</p> : null}

      <CeleYouNameDropSetup />

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Nfc className="h-3.5 w-3.5" />
          NFC
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          A programmed NFC card opens this same profile. Phone to phone NFC is not used. {nfc.guidance}
        </p>
        {nfc.canWrite ? (
          <button
            type="button"
            disabled={nfcBusy || !ready}
            onClick={() => void writeTag()}
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
          >
            Write tag
          </button>
        ) : (
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
            onClick={() => void copy("nfc", publicNfc)}
          >
            {copied === "nfc" ? "Copied NFC link" : "Copy NFC link"}
          </button>
        )}
        {nfcMessage ? <p className="mt-2 text-xs text-slate-700">{nfcMessage}</p> : null}
      </div>
      {cardId ? (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input
            id="studio-tap-discoverable"
            type="checkbox"
            className="mt-0.5"
            checked={discoverable}
            disabled={discoverBusy}
            onChange={() => void toggleDiscoverable()}
          />
          <span className="min-w-0 flex-1">
            <label htmlFor="studio-tap-discoverable" className="font-medium text-slate-900">
              Allow Tap-to-Connect
            </label>
            <span className="mt-0.5 block text-xs text-slate-500">
              When you show the card, Tap-to-Connect waits on the plate. Turn this off to refuse new Tap sessions.
            </span>
            <Link href={TAP_STUDIO_PATH} className="mt-1 inline-block text-xs font-semibold text-[#0B8A83]">
              Open Tap studio
            </Link>
          </span>
        </div>
      ) : null}
    </div>
  );
}
