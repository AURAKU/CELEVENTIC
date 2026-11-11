"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Download, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { writeCeleCardNfcUrl } from "@/lib/digital-business-card/nfc-write";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { getCeleYouShareOrigin, sanitizePublicUrl } from "@/lib/app-url";
import { nfcStudioPath } from "@/lib/digital-business-card/nfc-device";
import { SHARE_MY_CELEYOU, detectSmartShareCapability } from "@/lib/celeyou-share/engine";

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

  useEffect(() => {
    setDiscoverable(proximityDiscoverable);
  }, [proximityDiscoverable]);
  const nfc = useMemo(() => detectNfcWriteSupport(), []);
  const shareEngine = useMemo(() => detectSmartShareCapability(), []);
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
    void saveDigitalCardContact(vcard, { origin, source: "owner" });
  }

  async function writeTag() {
    setNfcBusy(true);
    setNfcMessage(null);
    const result = await writeCeleCardNfcUrl(publicNfc);
    setNfcBusy(false);
    setNfcMessage(result.ok ? "Tag written. The tag opens this CeleYou." : result.reason);
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
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">{SHARE_MY_CELEYOU}</p>
      <p className="text-xs text-slate-600">
        Tap the card to open the live page. Share and download sit on that plate. Recipients do not need CeleYou or an account.
      </p>
      <p className="text-[11px] leading-relaxed text-slate-500">{shareEngine.nearbyGuidance}</p>
      <Button asChild variant="outline" size="sm" disabled={!ready} className="w-full">
        <Link href={immersivePresent}>
          <CreditCard className="mr-2 h-4 w-4" />
          Hold up this card
        </Link>
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={saveContact}>
        <Download className="mr-2 h-4 w-4" />
        Save contact
      </Button>
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
        {cardId ? (
          <Link
            href={nfcStudioPath(cardId)}
            className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
          >
            Manage NFC cards
          </Link>
        ) : null}
      </div>
      {cardId ? (
        <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={discoverable}
            disabled={discoverBusy}
            onChange={() => void toggleDiscoverable()}
          />
          <span>
            <span className="font-medium text-slate-900">Allow Tap-to-Connect</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              When you show the card, Tap-to-Connect waits on the plate. Turn this off to refuse new Tap sessions.
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
