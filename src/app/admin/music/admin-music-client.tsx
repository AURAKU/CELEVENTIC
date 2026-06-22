"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Upload, Trash2, Loader2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PaginationBar } from "@/components/ui/pagination";
import { MUSIC_CATEGORIES } from "@/lib/music/music-constants";
import { formatAudioTime } from "@/lib/music/trimmed-audio-playback";

interface AdminTrack {
  id: string;
  title: string;
  artist: string | null;
  category: string;
  url: string;
  durationSec: number | null;
  isActive: boolean;
  sortOrder: number;
  createdBy?: { name: string } | null;
}

export function AdminMusicClient() {
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState("general");
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const res = await fetch(`/api/admin/music?page=${p}&limit=20`);
    const data = await res.json();
    if (data.success && data.data?.items) {
      setTracks(data.data.items);
      setPage(data.data.page);
      setPages(data.data.pages);
      setTotal(data.data.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) {
      setError("Title and audio file are required");
      return;
    }

    setUploading(true);
    setError("");

    let durationSec = 0;
    const blob = URL.createObjectURL(file);
    try {
      durationSec = await new Promise<number>((resolve, reject) => {
        const a = new Audio(blob);
        a.onloadedmetadata = () => resolve(a.duration);
        a.onerror = () => reject(new Error("metadata"));
      });
    } catch {
      durationSec = 0;
    } finally {
      URL.revokeObjectURL(blob);
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("artist", artist.trim());
    fd.append("category", category);
    fd.append("durationSec", String(durationSec));

    const res = await fetch("/api/admin/music", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setTitle("");
      setArtist("");
      if (fileRef.current) fileRef.current.value = "";
      void load(1);
    } else {
      setError(data.error || "Upload failed");
    }
  }

  async function toggleActive(track: AdminTrack) {
    await fetch("/api/admin/music", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: track.id, isActive: !track.isActive }),
    });
    void load(page);
  }

  async function removeTrack(id: string) {
    if (!confirm("Delete this track from the library?")) return;
    await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
    void load(page);
  }

  function togglePlay(track: AdminTrack) {
    if (playingId === track.id) {
      previewRef.current?.pause();
      setPlayingId(null);
      return;
    }
    previewRef.current?.pause();
    const audio = new Audio(track.url);
    previewRef.current = audio;
    void audio.play();
    setPlayingId(track.id);
    audio.onended = () => setPlayingId(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Music className="h-6 w-6 text-brand-600" />
          Invitation Music Library
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          Upload tracks organizers can choose for digital invitations. Users trim 1–2 minute clips.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload new track</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleUpload(e)} className="grid sm:grid-cols-2 gap-4">
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Artist (optional)</Label>
              <Input value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {MUSIC_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Audio file</Label>
              <Input ref={fileRef} type="file" accept="audio/*" required className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Add to library
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tracks yet.</p>
          ) : (
            <ul className="space-y-2">
              {tracks.map((track) => (
                <li
                  key={track.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                >
                  <Button type="button" size="icon" variant="outline" onClick={() => togglePlay(track)}>
                    {playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-medium text-sm">{track.title}</p>
                    <p className="text-xs text-slate-500">
                      {track.artist ?? "—"} · {MUSIC_CATEGORIES.find((c) => c.value === track.category)?.label ?? track.category}
                      {track.durationSec ? ` · ${formatAudioTime(track.durationSec)}` : ""}
                    </p>
                  </div>
                  <Badge variant={track.isActive ? "success" : "outline"}>
                    {track.isActive ? "Active" : "Hidden"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch checked={track.isActive} onCheckedChange={() => void toggleActive(track)} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => void removeTrack(track.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={setPage} className="mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
