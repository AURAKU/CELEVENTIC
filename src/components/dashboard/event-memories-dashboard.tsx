"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { PageLoader } from "@/components/ui/page-loader";
import { Check, X, Star, Trash2, QrCode, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { EventQrBranding } from "@/components/events/event-qr-branding";

interface MemoryItem {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  uploaderName?: string | null;
  status: string;
  createdAt: string;
  isFeatured?: boolean;
}

interface MemorySettings {
  maxPhotosPerGuest: number;
  maxVideosPerGuest: number;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  approvalRequired: boolean;
  guestOnlyMode: boolean;
  allowAnonymousUploads: boolean;
  allowDownloads: boolean;
  isEnabled: boolean;
}

interface Analytics {
  pending: number;
  approved: number;
  rejected: number;
  totalPhotos: number;
  totalVideos: number;
}

interface MemoryQrData {
  upload?: { qrImageUrl: string; url: string };
  view?: { qrImageUrl: string; url: string };
  qrImageUrl?: string;
  uploadUrl?: string;
  galleryUrl?: string;
  viewQrImageUrl?: string;
}

export function EventMemoriesDashboard({ eventId }: { eventId: string }) {
  const { page, setPage, appendToParams } = usePagination(20);
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [qrData, setQrData] = useState<MemoryQrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  const loadMemories = useCallback(async () => {
    const params = appendToParams(new URLSearchParams({ status: tab }));
    const res = await fetch(`/api/events/${eventId}/memories?${params}`);
    const d = await res.json();
    if (d.success) {
      setItems(d.data.items);
      setTotal(d.data.total);
      setPages(d.data.pages);
      setAnalytics(d.data.analytics);
    }
  }, [eventId, tab, appendToParams]);

  const loadSettings = useCallback(async () => {
    const [sRes, qRes] = await Promise.all([
      fetch(`/api/events/${eventId}/memory-settings`),
      fetch(`/api/events/${eventId}/memory-qr/generate`),
    ]);
    const s = await sRes.json();
    const q = await qRes.json();
    if (s.success) setSettings(s.data);
    if (q.success && q.data) setQrData(q.data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  async function approve(id: string) {
    await fetch(`/api/memories/${id}/approve`, { method: "PATCH" });
    void loadMemories();
  }

  async function reject(id: string) {
    await fetch(`/api/memories/${id}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    void loadMemories();
  }

  async function remove(id: string) {
    await fetch(`/api/memories/${id}`, { method: "DELETE" });
    void loadMemories();
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    await fetch(`/api/events/${eventId}/memories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setSelected(new Set());
    void loadMemories();
  }

  async function approveAllPending() {
    setApprovingAll(true);
    await fetch(`/api/events/${eventId}/memories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approveAllPending: true }),
    });
    setSelected(new Set());
    setApprovingAll(false);
    void loadMemories();
  }

  async function saveSettings() {
    if (!settings) return;
    await fetch(`/api/events/${eventId}/memory-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }

  async function regenerateQr(purpose: "UPLOAD" | "VIEW") {
    const res = await fetch(`/api/events/${eventId}/memory-qr/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true, purpose }),
    });
    const d = await res.json();
    if (d.success) {
      setQrData((prev) => ({
        ...prev,
        ...(purpose === "UPLOAD"
          ? {
              upload: { qrImageUrl: d.data.qrImageUrl, url: d.data.uploadUrl },
              qrImageUrl: d.data.qrImageUrl,
              uploadUrl: d.data.uploadUrl,
            }
          : {
              view: { qrImageUrl: d.data.qrImageUrl, url: d.data.galleryUrl },
              viewQrImageUrl: d.data.qrImageUrl,
              galleryUrl: d.data.galleryUrl,
            }),
      }));
    }
  }

  const uploadQrUrl = qrData?.upload?.qrImageUrl ?? qrData?.qrImageUrl;
  const viewQrUrl = qrData?.view?.qrImageUrl ?? qrData?.viewQrImageUrl;
  const uploadPageUrl = qrData?.upload?.url ?? qrData?.uploadUrl;
  const galleryPageUrl = qrData?.view?.url ?? qrData?.galleryUrl;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Event Memory Guestbook</h1>
          <p className="page-subtitle">Moderate uploads, control publishing, and share memory QR codes.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/events/${eventId}/thank-you`}>Thank-you page</Link>
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Pending", value: analytics.pending, color: "bg-amber-50 text-amber-800" },
            { label: "Approved", value: analytics.approved, color: "bg-green-50 text-green-800" },
            { label: "Rejected", value: analytics.rejected, color: "bg-red-50 text-red-800" },
            { label: "Photos", value: analytics.totalPhotos, color: "bg-blue-50 text-blue-800" },
            { label: "Videos", value: analytics.totalVideos, color: "bg-purple-50 text-purple-800" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="moderation">
        <TabsList>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="settings">Publishing & limits</TabsTrigger>
          <TabsTrigger value="qr">Memory QR</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => { setTab(s); setPage(1); }}>
                {s}
              </Button>
            ))}
            {tab === "PENDING" && analytics && analytics.pending > 0 && (
              <Button size="sm" className="gap-1 ml-auto" disabled={approvingAll} onClick={() => void approveAllPending()}>
                <ShieldCheck className="h-4 w-4" />
                {approvingAll ? "Approving…" : `Approve all (${analytics.pending})`}
              </Button>
            )}
            {tab === "PENDING" && selected.size > 0 && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void bulkApprove()}>
                <Check className="h-4 w-4" /> Approve selected ({selected.size})
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No {tab.toLowerCase()} uploads.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-[4/5] bg-slate-100 relative">
                    <UploadedMedia
                      src={item.thumbnailUrl ?? item.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      video={item.mediaType === "video"}
                      controls={false}
                      autoPlay={false}
                      muted
                    />
                    {tab === "PENDING" && (
                      <input
                        type="checkbox"
                        className="absolute top-2 left-2 h-4 w-4"
                        checked={selected.has(item.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          setSelected(next);
                        }}
                      />
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.uploaderName ?? "Guest"}</p>
                        {item.caption && <p className="text-xs text-slate-500 line-clamp-2">{item.caption}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{item.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {item.status === "PENDING" && (
                        <>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => void approve(item.id)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => void reject(item.id)}>
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void remove(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {item.isFeatured && <Star className="h-4 w-4 text-[#D4A63A] ml-auto" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          {settings && (
            <>
              <Card className="border-brand-200/60 bg-brand-50/30">
                <CardHeader>
                  <CardTitle className="text-base">Upload publishing mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4">
                    <div className="space-y-1">
                      <Label className="text-base">Require approval before publishing</Label>
                      <p className="text-sm text-slate-500">
                        {settings.approvalRequired
                          ? "Uploads stay pending until you approve them in Moderation."
                          : "Uploads are published automatically — no review step."}
                      </p>
                    </div>
                    <Switch
                      checked={settings.approvalRequired}
                      onCheckedChange={(v) => setSettings({ ...settings, approvalRequired: v })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Upload limits</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Max photos per guest</Label>
                    <Input type="number" value={settings.maxPhotosPerGuest} onChange={(e) => setSettings({ ...settings, maxPhotosPerGuest: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max videos per guest</Label>
                    <Input type="number" value={settings.maxVideosPerGuest} onChange={(e) => setSettings({ ...settings, maxVideosPerGuest: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max image size (MB)</Label>
                    <Input type="number" value={settings.maxImageSizeMb} onChange={(e) => setSettings({ ...settings, maxImageSizeMb: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max video size (MB)</Label>
                    <Input type="number" value={settings.maxVideoSizeMb} onChange={(e) => setSettings({ ...settings, maxVideoSizeMb: Number(e.target.value) })} />
                  </div>
                  {[
                    { key: "guestOnlyMode" as const, label: "Guest-only uploads", hint: "Require guest verification to upload" },
                    { key: "allowAnonymousUploads" as const, label: "Allow anonymous uploads", hint: "Let guests upload without signing in" },
                    { key: "allowDownloads" as const, label: "Allow downloads on gallery", hint: "Guests can download approved media" },
                    { key: "isEnabled" as const, label: "Memory guestbook enabled", hint: "Turn off to pause all uploads" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label>{label}</Label>
                        <p className="text-xs text-slate-500">{hint}</p>
                      </div>
                      <Switch checked={settings[key]} onCheckedChange={(v) => setSettings({ ...settings, [key]: v })} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Button onClick={() => void saveSettings()}>Save settings</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="qr" className="mt-4 space-y-4">
          <EventQrBranding eventId={eventId} />

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Upload QR
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-slate-600">Guests scan to upload photos & videos to this event.</p>
                {uploadQrUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadQrUrl} alt="Memory upload QR" className="w-52 h-52 mx-auto rounded-xl border bg-white p-3" />
                    {uploadPageUrl && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                        <a href={uploadPageUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Open upload page
                        </a>
                      </Button>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a href={`${uploadQrUrl}&download=1`} download>
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void regenerateQr("UPLOAD")}>
                        Regenerate
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Loading QR…</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Gallery view QR
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-slate-600">Scan to view approved memories — photos & videos for this event only.</p>
                {viewQrUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={viewQrUrl} alt="Memory gallery QR" className="w-52 h-52 mx-auto rounded-xl border bg-white p-3" />
                    {galleryPageUrl && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                        <a href={galleryPageUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Open gallery
                        </a>
                      </Button>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a href={`${viewQrUrl}&download=1`} download>
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void regenerateQr("VIEW")}>
                        Regenerate
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Loading QR…</p>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Upload a custom center logo above — both QR codes will regenerate with your image in the center.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
