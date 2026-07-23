"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MemoryTabs, type MemoryTab } from "@/components/memory/memory-tabs";
import { EventPicker } from "@/components/dashboard/event-picker";
import { EventMemoriesDashboard } from "@/components/dashboard/event-memories-dashboard";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useEventContext } from "@/hooks/use-event-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/ui/page-loader";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { MediaUploadVideo } from "@/components/media/media-upload-video";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { Archive, Lock, ExternalLink } from "lucide-react";
import { getClientAppUrl } from "@/lib/app-url";

const VALID_TABS: MemoryTab[] = ["vault", "guestbook", "gallery", "uploads", "legacy"];

interface MemoryItem {
  id: string;
  type: string;
  content: string | null;
  url: string | null;
  author: string | null;
}

interface VaultInfo {
  title: string | null;
  description: string | null;
  privacyStatus: string;
  storageLimitMb: number;
}

function MemoryHubContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "vault";
  const tab: MemoryTab = VALID_TABS.includes(rawTab as MemoryTab) ? (rawTab as MemoryTab) : "vault";
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Memory Vault</h1>
        <p className="page-subtitle">Preserve photos, videos, guestbooks, tributes, and legacy archives.</p>
      </div>

      <MemoryTabs active={tab} />

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {!eventId ? (
        <Card><CardContent className="p-8 text-center text-slate-500">Select an event to manage memories.</CardContent></Card>
      ) : (
        <>
          {tab === "vault" && <VaultPanel eventId={eventId} />}
          {tab === "guestbook" && <GuestbookPanel eventId={eventId} />}
          {tab === "gallery" && <GalleryPanel eventId={eventId} />}
          {tab === "uploads" && <EventMemoriesDashboard eventId={eventId} />}
          {tab === "legacy" && <LegacyPanel eventId={eventId} events={events} />}
        </>
      )}
    </div>
  );
}

function VaultPanel({ eventId }: { eventId: string }) {
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [vaultForm, setVaultForm] = useState({ title: "", description: "", privacyStatus: "PRIVATE" });
  const [error, setError] = useState("");
  const [viewTokenUrl, setViewTokenUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [memRes, vaultRes] = await Promise.all([
      fetch(`/api/memory?eventId=${eventId}&limit=1`),
      fetch(`/api/memory/vault?eventId=${eventId}`),
    ]);
    const d = await memRes.json();
    const v = await vaultRes.json();
    if (memRes.ok) setSummary(d.data.summary ?? {});
    if (vaultRes.ok) {
      setVault(v.data.vault);
      setVaultForm({
        title: v.data.vault.title ?? "",
        description: v.data.vault.description ?? "",
        privacyStatus: v.data.vault.privacyStatus ?? "PRIVATE",
      });
    } else setError(v.error);
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  async function saveVault(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/memory/vault", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...vaultForm }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function createGalleryLink() {
    const res = await fetch(`/api/events/${eventId}/memory-gallery/link`);
    const d = await res.json();
    if (d.success) setViewTokenUrl(d.data.galleryUrl);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {vault && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Vault Settings</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveVault} className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Vault title" value={vaultForm.title} onChange={(e) => setVaultForm({ ...vaultForm, title: e.target.value })} />
              <Select value={vaultForm.privacyStatus} onValueChange={(v) => setVaultForm({ ...vaultForm, privacyStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="UNLISTED">Unlisted</SelectItem>
                </SelectContent>
              </Select>
              <Textarea className="sm:col-span-2" placeholder="Description" value={vaultForm.description} onChange={(e) => setVaultForm({ ...vaultForm, description: e.target.value })} rows={2} />
              <Button type="submit" size="sm">Save Privacy</Button>
            </form>
            <p className="text-xs text-slate-500 mt-2">Storage limit: {vault.storageLimitMb} MB</p>
          </CardContent>
        </Card>
      )}
      {Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary).map(([type, count]) => (
            <div key={type} className="px-4 py-2 rounded-lg bg-brand-50 text-sm">
              <span className="font-medium capitalize">{type}</span>: {count}
            </div>
          ))}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Share Gallery</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-600">Generate a public gallery link for approved guest uploads.</p>
          <Button size="sm" variant="outline" onClick={createGalleryLink}>Generate gallery link</Button>
          {viewTokenUrl && (
            <p className="text-xs break-all text-brand-700">
              {viewTokenUrl.startsWith("http") ? viewTokenUrl : `${getClientAppUrl()}${viewTokenUrl}`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GuestbookPanel({ eventId }: { eventId: string }) {
  const { page, setPage, appendToParams, resetPage } = usePagination(20);
  const [guestbook, setGuestbook] = useState<MemoryItem[]>([]);
  const [gbTotal, setGbTotal] = useState(0);
  const [gbPages, setGbPages] = useState(1);
  const [form, setForm] = useState({ content: "", author: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams({ eventId, type: "guestbook" }));
    const res = await fetch(`/api/memory?${params}`);
    const d = await res.json();
    if (res.ok) {
      setGuestbook(d.data.items ?? []);
      setGbTotal(d.data.total ?? 0);
      setGbPages(d.data.pages ?? 1);
    }
  }, [eventId, appendToParams]);

  useEffect(() => { void load(); }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, type: "guestbook", content: form.content, author: form.author || undefined }),
    });
    if (res.ok) {
      setForm({ content: "", author: "" });
      resetPage();
      void load();
    } else setError((await res.json()).error);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Add Guestbook Entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addEntry} className="space-y-3">
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Write a message..." required />
            <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author (optional)" />
            <Button type="submit" className="w-full">Save Entry</Button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Guestbook</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto">
          {guestbook.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No guestbook entries yet.</p>
          ) : guestbook.map((m) => (
            <div key={m.id} className="p-3 rounded-lg border text-sm bg-[#FAF8F4]">
              <p className="italic">&ldquo;{m.content}&rdquo;</p>
              {m.author && <p className="text-xs text-slate-400 mt-2">— {m.author}</p>}
            </div>
          ))}
          <PaginationBar
            page={page}
            pages={gbPages}
            total={gbTotal}
            limit={20}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function GalleryPanel({ eventId }: { eventId: string }) {
  const { page, setPage, appendToParams } = usePagination(24);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memTotal, setMemTotal] = useState(0);
  const [memPages, setMemPages] = useState(1);
  const [form, setForm] = useState({ type: "photo", content: "", author: "", url: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams({ eventId }));
    const res = await fetch(`/api/memory?${params}`);
    const d = await res.json();
    if (res.ok) {
      setMemories(d.data.items ?? []);
      setMemTotal(d.data.total ?? 0);
      setMemPages(d.data.pages ?? 1);
    }
  }, [eventId, appendToParams]);

  useEffect(() => { void load(); }, [load]);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, type: form.type, content: form.content, author: form.author, url: form.url || undefined }),
    });
    if (res.ok) {
      setForm({ type: "photo", content: "", author: "", url: "" });
      load();
    } else setError((await res.json()).error);
  }

  const photos = memories.filter((m) => m.type === "photo" || m.type === "video");

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Add Media</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addMemory} className="space-y-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["photo", "video", "tribute", "highlight"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.type === "photo" && (
                <ImageUploadCropper
                  defaultAspect="4:5"
                  allowedAspects={CROP_PRESETS.gallery}
                  previewUrl={form.url || null}
                  onClear={() => setForm({ ...form, url: "" })}
                  buttonLabel="Upload & crop photo"
                  onUploaded={(r) => setForm({ ...form, url: r.url })}
                />
              )}
              {form.type === "video" && (
                <MediaUploadVideo
                  previewUrl={form.url || null}
                  onClear={() => setForm({ ...form, url: "" })}
                  onUploaded={(r) => setForm({ ...form, url: r.url })}
                  buttonLabel="Upload video"
                />
              )}
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} placeholder="Caption" />
              <Button type="submit" className="w-full">Save to Gallery</Button>
            </form>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">All Memories</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {memories.map((m) => (
              <div key={m.id} className="p-3 rounded-lg border text-sm">
                <span className="text-xs text-brand-600 uppercase">{m.type}</span>
                <p className="mt-1">{m.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {photos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Media Album</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((m) => (
              <div key={m.id} className="rounded-lg border overflow-hidden aspect-square bg-slate-100">
                {m.url && (
                  <UploadedMedia
                    src={m.url}
                    alt={m.content ?? "Memory"}
                    className="w-full h-full object-cover"
                    video={m.type === "video"}
                    controls={m.type === "video"}
                    autoPlay={false}
                  />
                )}
              </div>
            ))}
          </CardContent>
          <PaginationBar page={page} pages={memPages} total={memTotal} limit={24} onPageChange={setPage} className="px-6 pb-4" />
        </Card>
      )}
    </div>
  );
}

function LegacyPanel({
  eventId,
  events,
}: {
  eventId: string;
  events: Array<{ id: string; slug: string; title: string; eventType?: string }>;
}) {
  const event = events.find((e) => e.id === eventId);
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function publishLegacy() {
    setPublishing(true);
    const res = await fetch("/api/funeral/legacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, visibility: "FAMILY_ONLY" }),
    });
    const d = await res.json();
    setMessage(res.ok ? "Legacy archive published." : d.error ?? "Failed to publish");
    setPublishing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legacy Archive</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Publish a permanent legacy archive for {event?.title ?? "this event"} — obituary, tributes, timeline, and approved memories.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={publishLegacy} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish Legacy Archive"}
          </Button>
          {event?.slug && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/memorial/${event.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-1" /> View Memorial Page
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/funeral">FuneralOS Dashboard</Link>
          </Button>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </CardContent>
    </Card>
  );
}

export function MemoryHubClient() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MemoryHubContent />
    </Suspense>
  );
}
