"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, RefreshCw } from "lucide-react";
import { QR_GUIDE_DISPLAY_MIN_PX } from "@/lib/qr/qr-constants";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

/**
 * QR codes and printable signage.
 *
 * The two QR types are shown as clearly separate things. Rotating the online
 * code does not touch the venue backup, and the dual layout is only offered
 * when a backup destination actually exists.
 *
 * Previews use guide mode (pure black modules, wide quiet zone, no center logo)
 * so organizers see the same scannable code guests get on printed boards.
 */
export function GuideSignsTab({
  state,
  run,
  busy,
  eventId,
}: {
  state: GuideBuilderState;
  run: GuideAction;
  busy: boolean;
  eventId: string;
}) {
  const canEdit = state.permissions.canManage;
  const [size, setSize] = useState(state.signage.sizes[0]?.key ?? "a4");
  const [template, setTemplate] = useState(state.signage.templates[0]?.key ?? "classic");
  const [layout, setLayout] = useState<"single" | "dual">("single");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backup = state.links.venueOffline;
  const backupReady = Boolean(state.guide.venueOfflineEnabled && backup?.url);
  const published = state.guide.status === "PUBLISHED";
  const previewPx = Math.max(QR_GUIDE_DISPLAY_MIN_PX, 256);

  async function download(format: "pdf" | "png") {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/event-guide/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, size, template, layout, format }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not build the sign");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `event-guide-sign.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Codes are black-on-white with a wide quiet zone and no logo overlay — built for iPhone,
        Android, and tablet cameras under venue lighting. Point any camera at the printed board to
        open the live Event Guide link.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="stack-mobile">
            <CardTitle className="text-base">Main QR</CardTitle>
            <Badge className="shrink-0">Online</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.links.online.qrPreviewUrl ? (
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Image
                  src={state.links.online.qrPreviewUrl}
                  alt="Event Guide QR code"
                  width={previewPx}
                  height={previewPx}
                  unoptimized
                  className="bg-white"
                  style={{ width: previewPx, height: previewPx }}
                />
              </div>
            ) : null}
            <p className="break-all text-xs text-slate-500">{state.links.online.url}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(state.links.online.url)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
              </Button>
              {canEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Rotating replaces the code on every sign you have already printed. Continue?"
                      )
                    ) {
                      void run("rotate_token");
                    }
                  }}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Rotate
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="stack-mobile">
            <CardTitle className="text-base">Backup QR</CardTitle>
            <Badge variant="outline" className="shrink-0">
              Venue Wi-Fi only
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {backupReady && backup?.qrPreviewUrl ? (
              <>
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Image
                    src={backup.qrPreviewUrl}
                    alt="Venue offline Event Guide QR code"
                    width={previewPx}
                    height={previewPx}
                    unoptimized
                    className="bg-white"
                    style={{ width: previewPx, height: previewPx }}
                  />
                </div>
                <p className="break-all text-xs text-slate-500">{backup.url}</p>
                <p className="text-xs text-amber-700">
                  Only works for devices on
                  {state.guide.venueWifiName ? ` “${state.guide.venueWifiName}”` : " the event Wi-Fi"}.
                  The printed sign says so.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Not set up. Turn on the Venue Offline Pack under Offline and add the local address to
                print a backup code.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Printable sign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!published ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Publish the guide first, so the printed board matches what guests see after scanning.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="sign-size">
                Size
              </label>
              <select
                id="sign-size"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={size}
                onChange={(e) => setSize(e.target.value as typeof size)}
              >
                {state.signage.sizes.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} — {option.mm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="sign-template">
                Style
              </label>
              <select
                id="sign-template"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={template}
                onChange={(e) => setTemplate(e.target.value as typeof template)}
              >
                {state.signage.templates.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Codes on the sign</legend>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="sign-layout"
                className="mt-1"
                checked={layout === "single"}
                onChange={() => setLayout("single")}
              />
              <span>
                One large code
                <span className="block text-xs text-slate-500">
                  Scans from further away. Best for a welcome board.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-2 text-sm ${
                backupReady ? "" : "opacity-50"
              }`}
            >
              <input
                type="radio"
                name="sign-layout"
                className="mt-1"
                disabled={!backupReady}
                checked={layout === "dual"}
                onChange={() => setLayout("dual")}
              />
              <span>
                Main and backup, side by side
                <span className="block text-xs text-slate-500">
                  {backupReady
                    ? "Each code is labelled, and the backup carries the Wi-Fi warning."
                    : "Available once a venue offline address is configured."}
                </span>
              </span>
            </label>
          </fieldset>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={downloading || !published} onClick={() => void download("pdf")}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={downloading || !published}
              onClick={() => void download("png")}
            >
              <Download className="mr-1 h-4 w-4" /> Download PNG
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Printed at actual size on matte card. Each code sits on a white plate with a wide margin —
            printing a code straight onto a coloured background is the usual reason a sign will not
            scan under warm venue lighting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
