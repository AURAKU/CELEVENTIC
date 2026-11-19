"use client";

import { useEffect, useMemo, useState } from "react";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";

type Experience3DirectPreviewProps = {
  layoutSlug: string;
  category?: string;
  /** Mobile frame width in CSS px (approximate device chrome). */
  defaultDevice?: "mobile" | "desktop";
};

/**
 * Renders Experience 3.0 layouts through InvitationRenderer only.
 * Avoids PremiumInviteWrapper cinematic hub chrome so Studio 3 visual QA
 * inspects the versioned ix3 shell itself.
 *
 * Guest-journey sandbox: demo guest + local RSVP persistence + demo QR.
 * Never calls production RSVP APIs, payments, or messaging.
 */
export function Experience3DirectPreview({
  layoutSlug,
  category,
  defaultDevice = "mobile",
}: Experience3DirectPreviewProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">(defaultDevice);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const preview = useMemo(
    () =>
      buildLivePreviewProps(layoutSlug, category, {
        musicEnabled: false,
        musicAutoplay: false,
        skipIntro: true,
        skipTapGate: true,
        catalogSlug: layoutSlug,
      }),
    [layoutSlug, category]
  );

  const invitationId = `ix3-preview-${layoutSlug}`;

  useEffect(() => {
    let cancelled = false;
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(`celeventic-sandbox-pass:${layoutSlug}:demo-guest`, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M",
          color: { dark: "#111827", light: "#ffffff" },
        })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [layoutSlug]);

  const frameClass =
    device === "mobile"
      ? "mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.75rem] border border-stone-300 bg-white shadow-lg"
      : "mx-auto w-full max-w-[960px] overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-lg";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Direct Experience 3.0 shell · demo guest · sandbox RSVP
        </p>
        <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-0.5">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              device === "mobile" ? "bg-teal-700 text-white" : "text-slate-600"
            }`}
            onClick={() => setDevice("mobile")}
            aria-pressed={device === "mobile"}
          >
            Mobile
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              device === "desktop" ? "bg-teal-700 text-white" : "text-slate-600"
            }`}
            onClick={() => setDevice("desktop")}
            aria-pressed={device === "desktop"}
          >
            Desktop
          </button>
        </div>
      </div>
      <div className={frameClass}>
        <div className={device === "mobile" ? "max-h-[812px] overflow-y-auto" : "max-h-[900px] overflow-y-auto"}>
          <InvitationRenderer
            invitation={{
              id: invitationId,
              name: preview.invitationName,
              message: preview.message,
              uniqueLink: "preview",
            }}
            event={{
              ...preview.event,
              description: preview.event.description ?? null,
              startDateRaw: preview.event.startDateRaw ?? preview.event.startDate,
              venueName: preview.event.venueName ?? null,
              landmark: preview.event.landmark ?? null,
              mapsLink: preview.event.mapsLink ?? null,
              contactPhone: preview.event.contactPhone ?? null,
              dressCode: preview.event.dressCode ?? null,
            }}
            design={preview.design}
            guestId="demo-guest"
            guestName={preview.guestName}
            partyAllowance={2}
            qrDataUrl={qrDataUrl}
            interactiveMedia={false}
          />
        </div>
      </div>
    </div>
  );
}
