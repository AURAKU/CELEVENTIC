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
import { Check, X, Star, Trash2, QrCode, Download } from "lucide-react";

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

export function EventMemoriesDashboard({ eventId }: { eventId: string }) {
  const { page, setPage, appendToParams } = usePagination(20);
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    if (q.success && q.data?.qrImageUrl) setQrImageUrl(q.data.qrImageUrl);
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

  async function saveSettings() {
    if (!settings) return;
    await fetch(`/api/events/${eventId}/memory-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Event Memory Guestbook</h1>
          <p className="page-subtitle">Approve guest uploads, manage limits, and share the memory QR.</p>
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
          <TabsTrigger value="settings">Upload limits</TabsTrigger>
          <TabsTrigger value="qr">Memory QR</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => { setTab(s); setPage(1); }}>
                {s}
              </Button>
            ))}
            {tab === "PENDING" && selected.size > 0 && (
              <Button size="sm" className="gap-1" onClick={() => void bulkApprove()}>
                <Check className="h-4 w-4" /> Approve {selected.size}
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No {tab.toLowerCase()} uploads.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video bg-slate-100 relative">
                    {item.mediaType === "video" ? (
                      <video src={item.thumbnailUrl ?? item.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl ?? item.mediaUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
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

        <TabsContent value="settings" className="mt-4">
          {settings && (
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
                  { key: "approvalRequired" as const, label: "Require approval" },
                  { key: "guestOnlyMode" as const, label: "Guest-only uploads" },
                  { key: "allowAnonymousUploads" as const, label: "Allow anonymous uploads" },
                  { key: "allowDownloads" as const, label: "Allow downloads" },
                  { key: "isEnabled" as const, label: "Memory uploads enabled" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <Label>{label}</Label>
                    <Switch checked={settings[key]} onCheckedChange={(v) => setSettings({ ...settings, [key]: v })} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Button onClick={() => void saveSettings()}>Save settings</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="qr" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" /> Memory upload QR</CardTitle></CardHeader>
            <CardContent className="text-center space-y-4">
              {qrImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl} alt="Memory upload QR" className="w-56 h-56 mx-auto rounded-xl border bg-white p-3" />
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={`${qrImageUrl}&download=1`} download>
                      <Download className="h-4 w-4" /> Download for print
                    </a>
                  </Button>
                </>
              ) : (
                <p className="text-slate-500 text-sm">QR will appear after settings load.</p>
              )}
              <Button
                variant="secondary"
                onClick={async () => {
                  const res = await fetch(`/api/events/${eventId}/memory-qr/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ regenerate: true }),
                  });
                  const d = await res.json();
                  if (d.success) setQrImageUrl(d.data.qrImageUrl);
                }}
              >
                Regenerate QR
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
