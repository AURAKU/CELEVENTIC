"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Loader2, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { writeCeleCardNfcUrl } from "@/lib/digital-business-card/nfc-write";
import type { NfcDeviceAction, NfcDeviceStatus } from "@/lib/digital-business-card/nfc-device";

type CardRow = { id: string; displayName: string };
type DeviceRow = {
  id: string;
  name: string;
  deviceType: string;
  status: NfcDeviceStatus;
  publicToken: string;
  nfcUrl: string;
  tapCount: number;
  lastTapAt: string | null;
  createdAt: string;
};
type Desk = {
  card: { id: string; displayName: string; nfcEnabled: boolean; slug: string };
  devices: DeviceRow[];
  activeDevice: DeviceRow | null;
};

function statusLabel(status: NfcDeviceStatus) {
  if (status === "ACTIVE") return "Active";
  if (status === "DISABLED") return "Paused";
  if (status === "LOST") return "Lost";
  return "Replaced";
}

export function CeleCardNfcManager() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("card") ?? "";
  const [cards, setCards] = useState<CardRow[]>([]);
  const [cardId, setCardId] = useState(requestedId);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<NfcDeviceAction | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nfc = useMemo(() => detectNfcWriteSupport(), []);

  const loadDesk = useCallback(async (id: string) => {
    const res = await fetch(`/api/digital-business-cards/${id}/nfc`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not load NFC cards.");
    setDesk(json.data as Desk);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/digital-business-cards");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load CeleYou.");
        const list = ((json.data as CardRow[]) ?? []).map((row) => ({ id: row.id, displayName: row.displayName }));
        if (cancelled) return;
        setCards(list);
        const nextId = list.some((row) => row.id === requestedId) ? requestedId : list[0]?.id ?? "";
        setCardId(nextId);
        if (nextId) await loadDesk(nextId);
        else setDesk(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load NFC cards.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDesk, requestedId]);

  async function run(action: NfcDeviceAction, deviceId?: string) {
    if (!cardId) return;
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/nfc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, deviceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update the NFC card.");
      setDesk(json.data as Desk);
      if (action === "replace") setMessage("A new NFC link is ready. Program the replacement tag with this URL.");
      if (action === "lost") setMessage("Taps on that card now show that it was reported lost.");
      if (action === "pause") setMessage("Taps on that card are paused.");
      if (action === "resume") setMessage("Taps on that card are on again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the NFC card.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function writeTag(url: string) {
    setMessage(null);
    const result = await writeCeleCardNfcUrl(url);
    setMessage(result.ok ? "Tag written. Hold it to another phone to confirm it opens the profile." : result.reason);
  }

  const active = desk?.activeDevice ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/business-card"
          className="inline-flex flex-nowrap items-center gap-1 whitespace-nowrap text-sm font-medium text-[#0B8A83]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to studio
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">NFC cards</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Program a physical card with your public tap link. Pause, report lost, or replace a card without changing
          your QR or profile URL.
        </p>
      </div>

      {cards.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setCardId(card.id);
                void loadDesk(card.id);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                card.id === cardId
                  ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {card.displayName}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#0B8A83]">{message}</p> : null}

      {!loading && !desk ? (
        <p className="text-sm text-slate-600">Create a CeleYou first, then program an NFC card for it.</p>
      ) : null}

      {desk && active ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Nfc className="h-3.5 w-3.5" />
            Current card · {statusLabel(active.status)}
          </p>
          {!desk.card.nfcEnabled ? (
            <p className="mt-2 text-sm text-amber-800">
              NFC ready is off on this CeleYou. Save NFC ready in the studio to allow taps again.
            </p>
          ) : null}
          <p className="mt-3 break-all font-mono text-sm text-slate-800">{active.nfcUrl}</p>
          <p className="mt-1 text-xs text-slate-500">
            {active.tapCount.toLocaleString("en-GB")} recorded taps
            {active.lastTapAt ? ` · last ${new Date(active.lastTapAt).toLocaleString("en-GB")}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyLink(active.nfcUrl)}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy NFC link"}
            </Button>
            {nfc.canWrite ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void writeTag(active.nfcUrl)}>
                Write tag
              </Button>
            ) : (
              <p className="self-center text-xs text-slate-500">{nfc.guidance}</p>
            )}
            {active.status === "ACTIVE" ? (
              <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void run("pause", active.id)}>
                {busy === "pause" ? "Pausing…" : "Pause taps"}
              </Button>
            ) : null}
            {active.status === "DISABLED" ? (
              <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void run("resume", active.id)}>
                {busy === "resume" ? "Resuming…" : "Resume taps"}
              </Button>
            ) : null}
            {active.status === "ACTIVE" || active.status === "DISABLED" ? (
              <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void run("lost", active.id)}>
                {busy === "lost" ? "Saving…" : "Report lost"}
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={busy !== null} onClick={() => void run("replace", active.id)}>
              {busy === "replace" ? "Replacing…" : "Replace card"}
            </Button>
          </div>
        </div>
      ) : null}

      {desk && desk.devices.length > 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Earlier cards</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {desk.devices
              .filter((device) => device.id !== active?.id)
              .map((device) => (
                <li key={device.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                  <span>
                    {statusLabel(device.status)} · {device.tapCount.toLocaleString("en-GB")} taps
                  </span>
                  {device.status === "DISABLED" ? (
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
                      onClick={() => void run("resume", device.id)}
                    >
                      Resume
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
