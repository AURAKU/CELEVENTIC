"use client";

import { useState, useEffect, useCallback } from "react";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Lock } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { MediaUploadVideo } from "@/components/media/media-upload-video";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { useEventContext } from "@/hooks/use-event-context";

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

export default function MemoryVaultPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const { page, setPage, resetPage, appendToParams } = usePagination(24);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memTotal, setMemTotal] = useState(0);
  const [memPages, setMemPages] = useState(1);
  const [guestbook, setGuestbook] = useState<MemoryItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [form, setForm] = useState({ type: "guestbook", content: "", author: "", url: "" });
  const [vaultForm, setVaultForm] = useState({ title: "", description: "", privacyStatus: "PRIVATE" });
  const [error, setError] = useState("");

  const loadMemories = useCallback(async () => {
    if (!eventId) return;
    const params = appendToParams(new URLSearchParams({ eventId }));
    const [memRes, vaultRes] = await Promise.all([
      fetch(`/api/memory?${params}`),
      fetch(`/api/memory/vault?eventId=${eventId}`),
    ]);
    const d = await memRes.json();
    const v = await vaultRes.json();
    if (memRes.ok) {
      setMemories(d.data.items ?? d.data.memories ?? []);
      setMemTotal(d.data.total ?? 0);
      setMemPages(d.data.pages ?? 1);
      setSummary(d.data.summary ?? {});
    }
    if (vaultRes.ok) {
      setVault(v.data.vault);
      setGuestbook(v.data.guestbook ?? []);
      setVaultForm({
        title: v.data.vault.title ?? "",
        description: v.data.vault.description ?? "",
        privacyStatus: v.data.vault.privacyStatus ?? "PRIVATE",
      });
    } else {
      setError(v.error);
    }
  }, [eventId, appendToParams]);

  useEffect(() => {
    if (eventId) loadMemories();
  }, [eventId, loadMemories]);

  useEffect(() => {
    resetPage();
  }, [eventId, resetPage]);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, type: form.type, content: form.content, author: form.author, url: form.url || undefined }),
    });
    const d = await res.json();
    if (res.ok) {
      setForm({ type: "guestbook", content: "", author: "", url: "" });
      loadMemories();
    } else {
      setError(d.error || "Failed to save memory");
    }
  }

  async function saveVaultSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/memory/vault", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...vaultForm }),
    });
    if (res.ok) loadMemories();
    else setError((await res.json()).error);
  }

  const photos = memories.filter((m) => m.type === "photo" || m.type === "video");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Memory Vault</h1>
        <p className="page-subtitle">Preserve photos, videos, guestbooks, tributes, and highlights forever.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {vault && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Vault Settings</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveVaultSettings} className="grid sm:grid-cols-3 gap-3">
              <Input placeholder="Vault title" value={vaultForm.title} onChange={(e) => setVaultForm({ ...vaultForm, title: e.target.value })} />
              <Select value={vaultForm.privacyStatus} onValueChange={(v) => setVaultForm({ ...vaultForm, privacyStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="UNLISTED">Unlisted</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm">Save Privacy</Button>
            </form>
            <p className="text-xs text-slate-500 mt-2">Storage limit: {vault.storageLimitMb} MB · Plan: free</p>
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

      {photos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Media Album</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((m) => (
              <div key={m.id} className="rounded-lg border overflow-hidden aspect-square bg-slate-100 flex items-center justify-center">
                {m.url ? (
                  m.type === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.content ?? "Memory"} loading="lazy" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="text-xs text-slate-400 p-2 text-center">{m.content}</span>
                )}
              </div>
            ))}
          </CardContent>
          <PaginationBar page={page} pages={memPages} total={memTotal} limit={24} onPageChange={setPage} className="px-6 pb-4" />
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Add Memory</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addMemory} className="space-y-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!eventId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["photo", "video", "guestbook", "tribute", "highlight"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(form.type === "photo" || form.type === "video") && form.type === "photo" && (
                <div className="space-y-1">
                  <Label>Photo</Label>
                  <ImageUploadCropper
                    defaultAspect="4:5"
                    allowedAspects={CROP_PRESETS.gallery}
                    previewUrl={form.url || null}
                    onClear={() => setForm({ ...form, url: "" })}
                    disabled={!eventId}
                    buttonLabel="Upload & crop photo"
                    onUploaded={(r) => setForm({ ...form, url: r.url })}
                  />
                </div>
              )}
              {form.type === "video" && (
                <div className="space-y-1">
                  <Label>Video</Label>
                  <MediaUploadVideo
                    previewUrl={form.url || null}
                    onClear={() => setForm({ ...form, url: "" })}
                    onUploaded={(r) => setForm({ ...form, url: r.url })}
                    disabled={!eventId}
                    buttonLabel="Upload video"
                  />
                </div>
              )}
              <div className="space-y-1"><Label>Content / Caption</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Author (optional)</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} disabled={!eventId} /></div>
              <Button type="submit" className="w-full" disabled={!eventId}>Save Memory</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Guestbook</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {guestbook.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No guestbook entries yet.</p>
              ) : guestbook.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border text-sm bg-[#FAF8F4]">
                  <p className="italic">&ldquo;{m.content}&rdquo;</p>
                  {m.author && <p className="text-xs text-slate-400 mt-2">— {m.author}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">All Memories</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {memories.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No memories yet.</p>
              ) : memories.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border text-sm">
                  <span className="text-xs text-brand-600 uppercase">{m.type}</span>
                  <p className="mt-1">{m.content}</p>
                  {m.author && <p className="text-xs text-slate-400 mt-1">— {m.author}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
