"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Music,
  Upload,
  Trash2,
  Loader2,
  Play,
  Pause,
  Link2,
  Scissors,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PaginationBar } from "@/components/ui/pagination";
import {
  ADMIN_CLIP_MAX_SEC,
  ADMIN_CLIP_MIN_SEC,
  MUSIC_CATEGORIES,
  MUSIC_UPLOAD_MAX_BYTES,
  resolveMusicUpload,
} from "@/lib/music/music-constants";
import { formatAudioTime } from "@/lib/music/trimmed-audio-playback";
import { decodeAudioFile, trimAudioFileToWav } from "@/lib/music/trim-audio-client";

interface AdminTrack {
  id: string;
  title: string;
  artist: string | null;
  category: string;
  url: string;
  durationSec: number | null;
  clipStartSec?: number | null;
  clipEndSec?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdBy?: { name: string } | null;
  _count?: { catalogTemplates: number; events: number };
}

interface AssignTarget {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  defaultMusicTrackId: string | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AdminMusicClient() {
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState("general");

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(90);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const [assignTrack, setAssignTrack] = useState<AdminTrack | null>(null);
  const [templates, setTemplates] = useState<AssignTarget[]>([]);
  const [events, setEvents] = useState<AssignTarget[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  const clipLen = Math.max(0, endSec - startSec);
  const clipValid =
    sourceFile != null &&
    sourceDuration > 0 &&
    clipLen >= ADMIN_CLIP_MIN_SEC &&
    clipLen <= ADMIN_CLIP_MAX_SEC &&
    endSec > startSec;

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onFileChosen(file: File | null) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSourceFile(null);
    setSourceDuration(0);
    setStartSec(0);
    setEndSec(90);
    setError("");
    previewRef.current?.pause();
    setPreviewPlaying(false);

    if (!file) return;

    if (!resolveMusicUpload(file)) {
      setError("Unsupported media. Use an audio or media file the browser can decode.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MUSIC_UPLOAD_MAX_BYTES) {
      setError("File too large (max 40MB).");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setDecoding(true);
    try {
      const buffer = await decodeAudioFile(file);
      const duration = buffer.duration;
      const defaultEnd = Math.min(
        duration,
        Math.max(ADMIN_CLIP_MIN_SEC, Math.min(90, ADMIN_CLIP_MAX_SEC))
      );
      setSourceFile(file);
      setSourceDuration(duration);
      setStartSec(0);
      setEndSec(Math.min(duration, defaultEnd));
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "Untitled");
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch {
      setError(
        "Could not decode this file in the browser. Try MP3, WAV, M4A, OGG, FLAC, or another common audio format."
      );
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setDecoding(false);
    }
  }

  function setTrimStart(v: number) {
    const next = clamp(v, 0, Math.max(0, endSec - ADMIN_CLIP_MIN_SEC));
    setStartSec(Number(next.toFixed(2)));
  }

  function setTrimEnd(v: number) {
    const next = clamp(v, Math.min(sourceDuration, startSec + ADMIN_CLIP_MIN_SEC), sourceDuration);
    setEndSec(Number(next.toFixed(2)));
  }

  function togglePreview() {
    if (!previewUrl) return;
    if (previewPlaying) {
      previewRef.current?.pause();
      setPreviewPlaying(false);
      return;
    }
    previewRef.current?.pause();
    const audio = new Audio(previewUrl);
    previewRef.current = audio;
    audio.currentTime = startSec;
    void audio.play();
    setPreviewPlaying(true);
    const onUpdate = () => {
      if (audio.currentTime >= endSec - 0.05) {
        audio.pause();
        setPreviewPlaying(false);
        audio.removeEventListener("timeupdate", onUpdate);
      }
    };
    audio.addEventListener("timeupdate", onUpdate);
    audio.onended = () => setPreviewPlaying(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceFile || !title.trim()) {
      setError("Title and audio file are required");
      return;
    }
    if (!clipValid) {
      setError(
        `Select a clip between ${ADMIN_CLIP_MIN_SEC}s and ${ADMIN_CLIP_MAX_SEC}s (currently ${Math.round(clipLen)}s).`
      );
      return;
    }

    setUploading(true);
    setError("");

    try {
      const trimmed = await trimAudioFileToWav(sourceFile, startSec, endSec);
      const uploadFile = new File([trimmed.blob], trimmed.fileName, { type: "audio/wav" });

      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", title.trim());
      fd.append("artist", artist.trim());
      fd.append("category", category);
      fd.append("durationSec", String(trimmed.durationSec));
      fd.append("clipStartSec", String(startSec));
      fd.append("clipEndSec", String(endSec));

      const res = await fetch("/api/admin/music", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setTitle("");
      setArtist("");
      setSourceFile(null);
      setSourceDuration(0);
      setStartSec(0);
      setEndSec(90);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      void load(1);

      if (data.data?.id) {
        void openAssign({
          id: data.data.id,
          title: data.data.title,
          artist: data.data.artist,
          category: data.data.category,
          url: data.data.url,
          durationSec: data.data.durationSec,
          isActive: data.data.isActive,
          sortOrder: data.data.sortOrder,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trim or upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function openAssign(track: AdminTrack) {
    setAssignTrack(track);
    setAssignError("");
    setAssignLoading(true);
    setTemplateFilter("");
    setEventFilter("");
    try {
      const res = await fetch("/api/admin/music/assign");
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error || "Failed to load targets");
        setTemplates([]);
        setEvents([]);
        return;
      }
      const tpls: AssignTarget[] = data.data?.templates ?? [];
      const evs: AssignTarget[] = data.data?.events ?? [];
      setTemplates(tpls);
      setEvents(evs);
      setSelectedTemplateIds(
        new Set(tpls.filter((t) => t.defaultMusicTrackId === track.id).map((t) => t.id))
      );
      setSelectedEventIds(
        new Set(evs.filter((ev) => ev.defaultMusicTrackId === track.id).map((ev) => ev.id))
      );
    } catch {
      setAssignError("Failed to load templates and events");
    } finally {
      setAssignLoading(false);
    }
  }

  async function saveAssign() {
    if (!assignTrack) return;
    setAssignSaving(true);
    setAssignError("");
    try {
      const res = await fetch("/api/admin/music/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: assignTrack.id,
          clearTemplates: true,
          clearEvents: true,
          templateIds: Array.from(selectedTemplateIds),
          eventIds: Array.from(selectedEventIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error || "Assign failed");
        return;
      }
      setAssignTrack(null);
      void load(page);
    } catch {
      setAssignError("Assign failed");
    } finally {
      setAssignSaving(false);
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
    setPreviewPlaying(false);
    const audio = new Audio(track.url);
    previewRef.current = audio;
    void audio.play();
    setPlayingId(track.id);
    audio.onended = () => setPlayingId(null);
  }

  const filteredTemplates = useMemo(() => {
    const q = templateFilter.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name?.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [templates, templateFilter]);

  const filteredEvents = useMemo(() => {
    const q = eventFilter.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (ev) => ev.title?.toLowerCase().includes(q) || ev.slug.toLowerCase().includes(q)
    );
  }, [events, eventFilter]);

  const startPct = sourceDuration > 0 ? (startSec / sourceDuration) * 100 : 0;
  const endPct = sourceDuration > 0 ? (endSec / sourceDuration) * 100 : 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Music className="h-6 w-6 text-brand-600" />
          Invitation Music Library
        </h1>
        <p className="text-slate-600 mt-1 text-sm max-w-2xl">
          Upload any audio or media the browser can decode, trim the exact start→end window, then
          assign the clip as the default soundtrack for invitation templates or events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4 text-brand-600" />
            Upload & trim clip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleUpload(e)} className="grid sm:grid-cols-2 gap-4">
            {error && (
              <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
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
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Audio / media file</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="audio/*,video/mp4,video/webm,.mp3,.wav,.m4a,.aac,.ogg,.flac,.aiff,.wma,.opus,.webm,.caf,.amr"
                required
                className="mt-1"
                onChange={(e) => void onFileChosen(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-500 mt-1">
                MP3, WAV, M4A, OGG, FLAC, WebM, and more · max 40MB · trimmed to WAV before save
              </p>
            </div>

            {decoding && (
              <div className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Decoding audio…
              </div>
            )}

            {sourceFile && sourceDuration > 0 && (
              <div className="sm:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    Trim window · source {formatAudioTime(sourceDuration)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={togglePreview}
                  >
                    {previewPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Preview selection
                  </Button>
                </div>

                <div className="relative h-10 rounded-lg bg-slate-200 overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-brand-500/35 border-x-2 border-brand-600"
                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700 pointer-events-none">
                    {formatAudioTime(startSec)} → {formatAudioTime(endSec)} (
                    {formatAudioTime(clipLen)})
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Start (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={sourceDuration}
                      step={0.1}
                      value={startSec}
                      onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="range"
                      className="mt-2 w-full accent-brand-600"
                      min={0}
                      max={sourceDuration}
                      step={0.1}
                      value={startSec}
                      onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>End (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={sourceDuration}
                      step={0.1}
                      value={endSec}
                      onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="range"
                      className="mt-2 w-full accent-brand-600"
                      min={0}
                      max={sourceDuration}
                      step={0.1}
                      value={endSec}
                      onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <p
                  className={`text-xs ${
                    clipValid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  Clip must be {ADMIN_CLIP_MIN_SEC}–{ADMIN_CLIP_MAX_SEC} seconds.
                  {!clipValid && ` Adjust the handles (current ${Math.round(clipLen)}s).`}
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={uploading || decoding || !clipValid} className="gap-2">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Trim & add to library
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
              {tracks.map((track) => {
                const assigned =
                  (track._count?.catalogTemplates ?? 0) + (track._count?.events ?? 0);
                return (
                  <li
                    key={track.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => togglePlay(track)}
                    >
                      {playingId === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-[140px]">
                      <p className="font-medium text-sm">{track.title}</p>
                      <p className="text-xs text-slate-500">
                        {track.artist ?? "—"} ·{" "}
                        {MUSIC_CATEGORIES.find((c) => c.value === track.category)?.label ??
                          track.category}
                        {track.durationSec ? ` · ${formatAudioTime(track.durationSec)}` : ""}
                        {track.clipStartSec != null && track.clipEndSec != null
                          ? ` · from ${formatAudioTime(track.clipStartSec)}–${formatAudioTime(track.clipEndSec)}`
                          : ""}
                      </p>
                      {assigned > 0 && (
                        <p className="text-xs text-brand-700 mt-0.5">
                          Assigned to {track._count?.catalogTemplates ?? 0} template
                          {(track._count?.catalogTemplates ?? 0) === 1 ? "" : "s"},{" "}
                          {track._count?.events ?? 0} event
                          {(track._count?.events ?? 0) === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                    <Badge variant={track.isActive ? "success" : "outline"}>
                      {track.isActive ? "Active" : "Hidden"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void openAssign(track)}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                      <Switch
                        checked={track.isActive}
                        onCheckedChange={() => void toggleActive(track)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => void removeTrack(track.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={20}
            onPageChange={setPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {assignTrack && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Assign “{assignTrack.title}”</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Set this clip as the default music for invitation templates and events. Organizer
                picks on an order still override these defaults.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {assignError && <p className="text-sm text-red-600">{assignError}</p>}
              {assignLoading ? (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : (
                <>
                  <section>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Label className="text-sm font-medium">Invitation templates</Label>
                      <Input
                        className="max-w-[200px] h-8"
                        placeholder="Filter…"
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {filteredTemplates.length === 0 ? (
                        <li className="px-3 py-4 text-sm text-slate-500 text-center">
                          No templates found
                        </li>
                      ) : (
                        filteredTemplates.map((t) => {
                          const checked = selectedTemplateIds.has(t.id);
                          const other =
                            t.defaultMusicTrackId && t.defaultMusicTrackId !== assignTrack.id;
                          return (
                            <li key={t.id}>
                              <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  className="mt-1 accent-brand-600"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedTemplateIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(t.id)) next.delete(t.id);
                                      else next.add(t.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-800">
                                    {t.name}
                                  </span>
                                  <span className="block text-xs text-slate-500">{t.slug}</span>
                                  {other && (
                                    <span className="block text-xs text-amber-700 mt-0.5">
                                      Currently has another default track
                                    </span>
                                  )}
                                </span>
                                {checked && <Check className="h-4 w-4 text-brand-600 shrink-0 mt-1" />}
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Label className="text-sm font-medium">Events</Label>
                      <Input
                        className="max-w-[200px] h-8"
                        placeholder="Filter…"
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {filteredEvents.length === 0 ? (
                        <li className="px-3 py-4 text-sm text-slate-500 text-center">
                          No events found
                        </li>
                      ) : (
                        filteredEvents.map((ev) => {
                          const checked = selectedEventIds.has(ev.id);
                          const other =
                            ev.defaultMusicTrackId && ev.defaultMusicTrackId !== assignTrack.id;
                          return (
                            <li key={ev.id}>
                              <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  className="mt-1 accent-brand-600"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedEventIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(ev.id)) next.delete(ev.id);
                                      else next.add(ev.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-800">
                                    {ev.title}
                                  </span>
                                  <span className="block text-xs text-slate-500">{ev.slug}</span>
                                  {other && (
                                    <span className="block text-xs text-amber-700 mt-0.5">
                                      Currently has another default track
                                    </span>
                                  )}
                                </span>
                                {checked && <Check className="h-4 w-4 text-brand-600 shrink-0 mt-1" />}
                              </label>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </section>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignTrack(null)}
                disabled={assignSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={assignLoading || assignSaving}
                onClick={() => void saveAssign()}
              >
                {assignSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Save assignments
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
