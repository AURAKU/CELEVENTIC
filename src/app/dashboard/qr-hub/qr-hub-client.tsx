"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import type { QrHubAssetCard, QrHubAssetKind } from "@/lib/qr-hub/types";

type HubData = {
  event: { id: string; title: string; slug: string };
  assets: QrHubAssetCard[];
  vendor: {
    manualCode: string;
    tokenVersion: number;
    status: string;
    warning: string;
    variants: Array<{ roleKey: string; roleHeading: string }>;
    qrPreviewUrl: string | null;
    url: string | null;
  } | null;
  guestPasses: {
    items: Array<{
      id: string;
      displayName: string;
      code: string;
      status: string;
      partySize: number;
      admittedCount: number;
    }>;
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  vendorScans: Array<{
    id: string;
    result: string;
    gate: string | null;
    operatorRoleNote: string | null;
    createdAt: string;
  }>;
  permissions: {
    canManage: boolean;
    canDownload: boolean;
    canManageVendor: boolean;
    canViewScans: boolean;
  };
};

const PACK_KINDS: QrHubAssetKind[] = [
  "GIFT",
  "MENU",
  "SEATING",
  "MEMORY_UPLOAD",
  "MEMORY_ALBUM",
  "PROGRAMME",
  "VENUE",
  "HELP",
  "VENDOR",
  "CUSTOM",
];

export function QrHubClient() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [tab, setTab] = useState<
    "overview" | "vendor" | "passes" | "print" | "scans" | "settings"
  >("overview");
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [passPage, setPassPage] = useState(1);
  const [packKinds, setPackKinds] = useState<QrHubAssetKind[]>([
    "GIFT",
    "MENU",
    "SEATING",
    "VENDOR",
    "MEMORY_UPLOAD",
  ]);
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/qr-hub?eventId=${eventId}&passPage=${passPage}`);
    const payload = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(payload.error ?? "Could not load QR Hub");
      return;
    }
    setData(payload.data);
  }, [eventId, passPage]);

  useEffect(() => {
    if (eventId) void load();
  }, [eventId, load]);

  async function act(action: string, body: Record<string, unknown> = {}) {
    if (!eventId) return;
    setBusy(action);
    setError("");
    setNotice("");
    const res = await fetch("/api/qr-hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action, ...body }),
    });
    const payload = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(payload.error ?? "Action failed");
      return;
    }
    setNotice("Updated.");
    await load();
  }

  async function downloadPack(format: "png" | "svg" | "pdf") {
    if (!eventId) return;
    setBusy(`pack-${format}`);
    setError("");
    const res = await fetch("/api/qr-hub/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, kinds: packKinds, format, size: 1024, perPage: 2 }),
    });
    setBusy(null);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError((payload as { error?: string }).error ?? "Pack download failed");
      return;
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = /filename=\"([^\"]+)\"/.exec(cd);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = match?.[1] || `qr-pack.${format === "pdf" ? "pdf" : "zip"}`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice("QR pack downloaded.");
  }

  const grouped = useMemo(() => data?.assets ?? [], [data]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold sm:text-2xl">Event QR & Pass Hub</h1>
        <p className="page-subtitle">
          Create, download and manage every QR experience connected to your event.
        </p>
      </header>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

      {!eventId ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            Choose an event to open its QR & Pass Hub.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b">
            {(
              [
                ["overview", "QR Overview"],
                ["vendor", "Vendor Access Pass"],
                ["passes", "Personalised Guest Passes"],
                ["print", "Print & Download"],
                ["scans", "Scan Activity"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-3 py-2 text-sm font-semibold ${
                  tab === id ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : null}

          {tab === "overview" && data ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {grouped.map((asset) => (
                <AssetCard key={`${asset.kind}-${asset.title}`} asset={asset} />
              ))}
            </div>
          ) : null}

          {tab === "vendor" && data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shared Vendor Access Pass</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {data.vendor?.warning ||
                    "All vendor badge variants use the same shared event credential. Revoking or regenerating it will affect every printed vendor pass."}
                </p>
                <p className="text-sm">
                  Status: <Badge>{data.vendor?.status ?? "—"}</Badge> · Code:{" "}
                  <strong className="tracking-widest">{data.vendor?.manualCode ?? "—"}</strong> ·
                  Version {data.vendor?.tokenVersion ?? "—"}
                </p>
                {data.vendor?.qrPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.vendor.qrPreviewUrl}
                    alt="Vendor access QR"
                    className="h-40 w-40 rounded-lg border"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {data.permissions.canManageVendor ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === "regenerate_vendor"}
                        onClick={() => void act("regenerate_vendor")}
                      >
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === "revoke_vendor"}
                        onClick={() => void act("revoke_vendor", { reason: "Revoked from QR Hub" })}
                      >
                        Revoke
                      </Button>
                    </>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Print variants (same QR + code)
                  </p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(data.vendor?.variants ?? []).map((v) => (
                      <li key={v.roleKey} className="rounded-lg border px-3 py-2 text-sm font-semibold">
                        {v.roleHeading}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {tab === "passes" && data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personalised Guest Entry Passes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Each guest keeps a unique signed credential. A shared public QR never admits every
                  guest.
                </p>
                {data.guestPasses.items.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold">{pass.displayName}</p>
                      <p className="text-xs text-slate-500">
                        Code {pass.code} · {pass.admittedCount}/{pass.partySize} admitted ·{" "}
                        {pass.status}
                      </p>
                    </div>
                  </div>
                ))}
                <PaginationBar
                  page={data.guestPasses.page}
                  pages={data.guestPasses.pages}
                  total={data.guestPasses.total}
                  limit={data.guestPasses.limit}
                  onPageChange={setPassPage}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === "print" && data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Ground QR Pack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {PACK_KINDS.map((kind) => (
                    <label key={kind} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={packKinds.includes(kind)}
                        onChange={(e) =>
                          setPackKinds((prev) =>
                            e.target.checked ? [...prev, kind] : prev.filter((k) => k !== kind)
                          )
                        }
                      />
                      {kind}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!data.permissions.canDownload || busy === "pack-png"}
                    onClick={() => void downloadPack("png")}
                  >
                    <Download className="h-4 w-4" /> ZIP PNG
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!data.permissions.canDownload || busy === "pack-svg"}
                    onClick={() => void downloadPack("svg")}
                  >
                    ZIP SVG
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!data.permissions.canDownload || busy === "pack-pdf"}
                    onClick={() => void downloadPack("pdf")}
                  >
                    Combined PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {tab === "scans" && data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendor scan activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!data.permissions.canViewScans ? (
                  <p className="text-sm text-slate-500">You do not have permission to view scans.</p>
                ) : data.vendorScans.length === 0 ? (
                  <p className="text-sm text-slate-500">No vendor scans yet.</p>
                ) : (
                  data.vendorScans.map((scan) => (
                    <div key={scan.id} className="rounded-lg border px-3 py-2 text-sm">
                      <strong>{scan.result}</strong>
                      {scan.operatorRoleNote ? ` · ${scan.operatorRoleNote}` : ""}
                      {scan.gate ? ` · ${scan.gate}` : ""}
                      <span className="text-xs text-slate-500">
                        {" "}
                        · {new Date(scan.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "settings" && data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom QR link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Destination URL (https)</Label>
                  <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} />
                </div>
                <Button
                  disabled={!data.permissions.canManage || busy === "create_custom"}
                  onClick={() =>
                    void act("create_custom", { title: customTitle, destinationUrl: customUrl })
                  }
                >
                  <Settings2 className="h-4 w-4" /> Create custom QR
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function AssetCard({ asset }: { asset: QrHubAssetCard }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{asset.kind}</p>
            <h3 className="font-semibold">{asset.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{asset.purpose}</p>
          </div>
          <Badge variant={asset.enabled ? "success" : "outline"}>{asset.statusLabel}</Badge>
        </div>
        {asset.qrPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.qrPreviewUrl} alt="" className="h-28 w-28 rounded-md border bg-white" loading="lazy" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-md border bg-slate-50">
            <QrCode className="h-8 w-8 text-slate-300" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {asset.url ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(asset.url!)}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <a href={asset.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" type="button">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </Button>
              </a>
              <a
                href={`${asset.qrPreviewUrl}&size=1024&download=1`}
                download
              >
                <Button size="sm" variant="outline" type="button">
                  <Download className="h-3.5 w-3.5" /> PNG
                </Button>
              </a>
            </>
          ) : null}
          {asset.openStudioHref ? (
            <a href={asset.openStudioHref}>
              <Button size="sm" variant="outline" type="button">
                Open studio
              </Button>
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
