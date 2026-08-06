"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCircle2, Circle, Download, Upload } from "lucide-react";
import type { OfflineSeatingMode } from "@/lib/event-guide/offline-pack";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

interface ReadinessCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Offline Readiness.
 *
 * Level 1 needs nothing from the organizer beyond publishing. Level 2 is a real
 * operational commitment — a machine, a network and someone to run it — so the
 * checklist is explicit about what still has to be true on the day.
 */
export function GuideOfflineTab({
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
  const g = state.guide;
  const [offlineEnabled, setOfflineEnabled] = useState(g.offlineEnabled);
  const [venueEnabled, setVenueEnabled] = useState(g.venueOfflineEnabled);
  const [seatingMode, setSeatingMode] = useState<OfflineSeatingMode>(g.offlineSeatingMode);
  const [localUrl, setLocalUrl] = useState(g.venueLocalUrl ?? "");
  const [wifi, setWifi] = useState(g.venueWifiName ?? "");
  const [packNotice, setPackNotice] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<string | null>(null);

  const activePack = state.offline.packs.find((pack) => pack.status === "ACTIVE") ?? null;

  const checks: ReadinessCheck[] = useMemo(() => {
    const list: ReadinessCheck[] = [
      {
        label: "Guide is published",
        ok: g.status === "PUBLISHED",
        detail:
          g.status === "PUBLISHED"
            ? "Guests can open the guide and their phone can save it."
            : "Publish the guide — nothing is cached or packed until you do.",
      },
      {
        label: "Phone offline mode is on",
        ok: offlineEnabled,
        detail: offlineEnabled
          ? "After one online visit, a guest's phone keeps the programme and menu."
          : "Guests will lose the guide the moment signal drops.",
      },
      {
        label: "No unpublished changes",
        ok: !g.snapshotStale,
        detail: g.snapshotStale
          ? "Your latest edits are not in the published snapshot, so they will not be saved offline or packed."
          : "What guests see matches what you have edited.",
      },
    ];

    if (venueEnabled) {
      list.push(
        {
          label: "Venue address configured",
          ok: Boolean(localUrl.trim()),
          detail: localUrl.trim()
            ? `Guests reach the local guide at ${localUrl.trim()}`
            : "Add the address the venue machine will serve on, e.g. http://eventguide.local:4173",
        },
        {
          label: "Wi-Fi name recorded",
          ok: Boolean(wifi.trim()),
          detail: wifi.trim()
            ? `The backup sign will say “${wifi.trim()}”.`
            : "Without the network name the printed backup sign is vague and guests will ask staff.",
        },
        {
          label: "A current pack has been downloaded",
          ok: Boolean(activePack && activePack.guideVersion === g.version),
          detail: !activePack
            ? "Download a pack and test it on the venue machine before the day."
            : activePack.guideVersion === g.version
              ? `Pack v${activePack.packVersion} matches the current guide.`
              : `Pack v${activePack.packVersion} was built from guide v${activePack.guideVersion}. Download a fresh one.`,
        },
        {
          label: "Seating privacy mode chosen",
          ok: seatingMode !== "DISABLED",
          detail:
            seatingMode === "DISABLED"
              ? "The venue pack will carry the programme and menu only. Seat lookup will need the internet."
              : state.offline.seatingModes.find((m) => m.value === seatingMode)?.detail ?? "",
        }
      );
    }

    return list;
  }, [g, offlineEnabled, venueEnabled, localUrl, wifi, activePack, seatingMode, state.offline.seatingModes]);

  const ready = checks.every((check) => check.ok);

  async function downloadPack() {
    setPackNotice(null);
    const response = await fetch(`/api/event-guide/offline-pack?eventId=${encodeURIComponent(eventId)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setPackNotice(body?.error ?? "Could not build the pack");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "event-guide-offline-pack.zip";
    anchor.click();
    URL.revokeObjectURL(url);
    setPackNotice(
      "Pack downloaded. Unzip it on the venue machine and run `node serve.mjs`. Treat the file like a key."
    );
  }

  async function uploadQueue(file: File) {
    setSyncReport(null);
    try {
      const records = JSON.parse(await file.text());
      const data = await run("sync_offline_pack", {
        token: prompt("Paste the offline token from the pack's manifest.json") ?? "",
        packVersion: activePack?.packVersion ?? 0,
        guideVersion: activePack?.guideVersion ?? 0,
        records,
      });
      if (data) {
        const report = data as { acceptedRecords: number; duplicateRecords: number; conflicts: Array<{ detail: string }> };
        setSyncReport(
          [
            `${report.acceptedRecords} new records merged.`,
            report.duplicateRecords > 0 ? `${report.duplicateRecords} already counted.` : "",
            ...report.conflicts.map((c) => c.detail),
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
    } catch {
      setSyncReport("That file is not a readable sync-queue.json.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On a guest&rsquo;s phone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Keep the guide working without signal</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                After one online visit, the programme, menu and design stay on the guest&rsquo;s
                phone.
              </span>
            </span>
            <Switch checked={offlineEnabled} onCheckedChange={setOfflineEnabled} disabled={!canEdit} />
          </label>
          <p className="rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Seat lookup always needs a connection. Storing a seating index on guests&rsquo; phones
            would be publishing your guest list, so we never do it — the guide says so plainly when
            offline.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="stack-mobile">
          <CardTitle className="text-base">Venue Offline Pack</CardTitle>
          <Badge variant="outline" className="shrink-0">
            Advanced
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Run the guide on the venue network</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                For venues with no usable mobile signal. Needs a laptop or mini-server on site and
                someone to start it.
              </span>
            </span>
            <Switch checked={venueEnabled} onCheckedChange={setVenueEnabled} disabled={!canEdit} />
          </label>

          {venueEnabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="venue-url">
                    Local address
                  </label>
                  <Input
                    id="venue-url"
                    className="mt-1"
                    value={localUrl}
                    disabled={!canEdit}
                    onChange={(e) => setLocalUrl(e.target.value)}
                    placeholder="http://eventguide.local:4173"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="venue-wifi">
                    Venue Wi-Fi name
                  </label>
                  <Input
                    id="venue-wifi"
                    className="mt-1"
                    value={wifi}
                    disabled={!canEdit}
                    onChange={(e) => setWifi(e.target.value)}
                    placeholder="Grand Hall Guest"
                  />
                </div>
              </div>

              <fieldset disabled={!canEdit} className="space-y-2">
                <legend className="text-sm font-medium">Seat lookup in the pack</legend>
                {state.offline.seatingModes.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                      seatingMode === option.value ? "border-teal-600 bg-teal-50/50" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="offline-seating-mode"
                      className="mt-1"
                      checked={seatingMode === option.value}
                      onChange={() => setSeatingMode(option.value)}
                    />
                    <span className="text-sm">
                      <span className="font-medium">{option.label}</span>
                      {option.privacy === "reduced" ? (
                        <Badge variant="outline" className="ml-2 border-amber-300 text-amber-800">
                          Least private
                        </Badge>
                      ) : null}
                      <span className="mt-0.5 block text-xs text-slate-500">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </>
          ) : null}

          {canEdit ? (
            <Button
              disabled={busy}
              onClick={() =>
                void run("configure_offline", {
                  offlineEnabled,
                  venueOfflineEnabled: venueEnabled,
                  offlineSeatingMode: seatingMode,
                  venueLocalUrl: localUrl,
                  venueWifiName: wifi,
                })
              }
            >
              Save offline settings
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-start gap-2 text-sm">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <span className="min-w-0">
                <span className="font-medium">{check.label}</span>
                <span className="block text-xs text-slate-500">{check.detail}</span>
              </span>
            </div>
          ))}
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              ready
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {ready
              ? "Everything is in place. Test the whole flow on the venue network before the day."
              : "Some steps are still open. Guests can still use the guide online."}
          </p>
        </CardContent>
      </Card>

      {venueEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pack &amp; sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!state.permissions.canDownload || g.status !== "PUBLISHED"}
                onClick={() => void downloadPack()}
              >
                <Download className="mr-1 h-4 w-4" /> Download pack
              </Button>
              {canEdit && state.offline.packs.some((p) => p.status === "ACTIVE") ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Every pack already downloaded will stop working after its next sync. Continue?"
                      )
                    ) {
                      void run("revoke_offline_packs", { reason: "Revoked by organizer" });
                    }
                  }}
                >
                  Revoke all packs
                </Button>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                <Upload className="h-4 w-4" /> Upload sync-queue.json
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadQueue(file);
                  }}
                />
              </label>
            </div>

            {packNotice ? (
              <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{packNotice}</span>
              </p>
            ) : null}
            {syncReport ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                {syncReport}
              </p>
            ) : null}

            {state.offline.packs.length > 0 ? (
              <div className="space-y-2">
                {state.offline.packs.map((pack) => (
                  <div key={pack.id} className="stack-mobile rounded-lg border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        Pack v{pack.packVersion}{" "}
                        <span className="font-normal text-slate-500">
                          from guide v{pack.guideVersion}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Expires {new Date(pack.expiresAt).toLocaleString()} ·{" "}
                        {pack.lastSyncedAt
                          ? `synced ${new Date(pack.lastSyncedAt).toLocaleString()}`
                          : "never synced"}
                      </p>
                    </div>
                    <Badge variant={pack.status === "ACTIVE" ? "default" : "outline"} className="shrink-0">
                      {pack.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
