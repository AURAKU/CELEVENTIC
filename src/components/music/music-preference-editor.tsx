"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Upload, Play, Pause, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MusicLibraryTrack, MusicSelection } from "@/lib/music/music-types";
import {
  MUSIC_CLIP_MAX_SEC,
  MUSIC_CLIP_MIN_SEC,
} from "@/lib/music/music-constants";
import {
  clipDurationSec,
  defaultTrimRange,
  validateMusicSelection,
} from "@/lib/music/validate-selection";
import { formatAudioTime } from "@/lib/music/trimmed-audio-playback";

interface MusicPreferenceEditorProps {
  value: MusicSelection | null;
  onChange: (selection: MusicSelection | null) => void;
  eventType?: string;
  disabled?: boolean;
}

function categoryForEventType(eventType?: string) {
  const map: Record<string, string> = {
    WEDDING: "wedding",
    ENGAGEMENT: "wedding",
    FUNERAL: "funeral",
    CORPORATE_EVENT: "corporate",
    CHURCH_PROGRAM: "church",
  };
  return map[eventType ?? ""] ?? "general";
}

async function loadAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(audio.duration || 0);
    audio.onerror = () => reject(new Error("Could not load audio"));
  });
}

export function MusicPreferenceEditor({
  value,
  onChange,
  eventType,
  disabled,
}: MusicPreferenceEditorProps) {
  const [tab, setTab] = useState<"library" | "upload">(value?.source === "upload" ? "upload" : "library");
  const [library, setLibrary] = useState<MusicLibraryTrack[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trackUrl, setTrackUrl] = useState(value?.url ?? "");
  const [trackTitle, setTrackTitle] = useState(value?.title ?? "");
  const [libraryTrackId, setLibraryTrackId] = useState(value?.libraryTrackId ?? "");
  const [durationSec, setDurationSec] = useState(value?.originalDurationSec ?? 0);
  const [startSec, setStartSec] = useState(value?.startSec ?? 0);
  const [endSec, setEndSec] = useState(value?.endSec ?? MUSIC_CLIP_MAX_SEC);
  const [volume, setVolume] = useState(value?.volume ?? 0.5);
  const [loop, setLoop] = useState(value?.loop ?? true);
  const [fadeInSec, setFadeInSec] = useState(value?.fadeInSec ?? 1.5);
  const [fadeOutSec, setFadeOutSec] = useState(value?.fadeOutSec ?? 2);
  const [autoPlay, setAutoPlay] = useState(value?.autoPlay ?? true);

  const VOLUME_PRESETS = [
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "75%", value: 0.75 },
    { label: "100%", value: 1 },
  ];

  const clipLen = clipDurationSec({ startSec, endSec });
  const clipValid = clipLen >= MUSIC_CLIP_MIN_SEC && clipLen <= MUSIC_CLIP_MAX_SEC;
  const validationError = trackUrl
    ? validateMusicSelection({
        source: tab,
        libraryTrackId: libraryTrackId || undefined,
        url: trackUrl,
        title: trackTitle,
        startSec,
        endSec,
        originalDurationSec: durationSec || undefined,
      })
    : null;

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const cat = categoryForEventType(eventType);
      const res = await fetch(`/api/music/library?category=${cat}`);
      const data = await res.json();
      let tracks: MusicLibraryTrack[] = data.data ?? [];
      if (tracks.length === 0 && cat !== "general") {
        const fallback = await fetch("/api/music/library?category=general");
        const fb = await fallback.json();
        tracks = fb.data ?? [];
      }
      setLibrary(tracks);
    } catch {
      setLibrary([]);
    } finally {
      setLoadingLibrary(false);
    }
  }, [eventType]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  function emitSelection(
    next: Partial<{
      url: string;
      title: string;
      libraryTrackId: string;
      durationSec: number;
      startSec: number;
      endSec: number;
      source: "library" | "upload";
      volume: number;
      loop: boolean;
      fadeInSec: number;
      fadeOutSec: number;
      autoPlay: boolean;
    }>
  ) {
    const merged = {
      source: next.source ?? tab,
      url: next.url ?? trackUrl,
      title: next.title ?? trackTitle,
      libraryTrackId: next.libraryTrackId ?? libraryTrackId,
      durationSec: next.durationSec ?? durationSec,
      startSec: next.startSec ?? startSec,
      endSec: next.endSec ?? endSec,
      volume: next.volume ?? volume,
      loop: next.loop ?? loop,
      fadeInSec: next.fadeInSec ?? fadeInSec,
      fadeOutSec: next.fadeOutSec ?? fadeOutSec,
      autoPlay: next.autoPlay ?? autoPlay,
    };
    if (!merged.url) {
      onChange(null);
      return;
    }
    const selection: MusicSelection = {
      source: merged.source,
      libraryTrackId: merged.libraryTrackId || undefined,
      url: merged.url,
      title: merged.title || undefined,
      startSec: merged.startSec,
      endSec: merged.endSec,
      originalDurationSec: merged.durationSec || undefined,
      volume: merged.volume,
      loop: merged.loop,
      fadeInSec: merged.fadeInSec,
      fadeOutSec: merged.fadeOutSec,
      autoPlay: merged.autoPlay,
    };
    if (!validateMusicSelection(selection)) onChange(selection);
    else onChange(null);
  }

  function stopPreview() {
    previewRef.current?.pause();
    previewRef.current = null;
    setPreviewPlaying(false);
  }

  function togglePreview() {
    if (previewPlaying) {
      stopPreview();
      return;
    }
    if (!trackUrl) return;
    stopPreview();
    const audio = new Audio(trackUrl);
    previewRef.current = audio;
    audio.currentTime = startSec;
    audio.volume = 0.5;
    audio.ontimeupdate = () => {
      if (audio.currentTime >= endSec) audio.currentTime = startSec;
    };
    void audio.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
  }

  useEffect(() => () => stopPreview(), []);

  async function selectLibraryTrack(track: MusicLibraryTrack) {
    setError("");
    stopPreview();
    setTab("library");
    setLibraryTrackId(track.id);
    setTrackUrl(track.url);
    setTrackTitle(track.title);
    try {
      const dur = track.durationSec ?? (await loadAudioDuration(track.url));
      setDurationSec(dur);
      const range = defaultTrimRange(dur);
      setStartSec(range.startSec);
      setEndSec(range.endSec);
      emitSelection({
        source: "library",
        url: track.url,
        title: track.title,
        libraryTrackId: track.id,
        durationSec: dur,
        startSec: range.startSec,
        endSec: range.endSec,
      });
    } catch {
      const dur = track.durationSec ?? 120;
      setDurationSec(dur);
      setStartSec(0);
      const end = Math.min(MUSIC_CLIP_MAX_SEC, dur);
      setEndSec(end);
      emitSelection({
        source: "library",
        url: track.url,
        title: track.title,
        libraryTrackId: track.id,
        durationSec: dur,
        startSec: 0,
        endSec: end,
      });
    }
  }

  async function handleFileUpload(file: File) {
    setError("");
    setUploading(true);
    stopPreview();
    try {
      let dur = 0;
      const blobUrl = URL.createObjectURL(file);
      try {
        dur = await loadAudioDuration(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      if (dur > 0 && dur < MUSIC_CLIP_MIN_SEC) {
        setError(`Track must be at least ${MUSIC_CLIP_MIN_SEC} seconds long.`);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("durationSec", String(dur));
      const res = await fetch("/api/music/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setTab("upload");
      setLibraryTrackId("");
      setTrackUrl(data.data.url);
      setTrackTitle(data.data.title ?? file.name);
      const finalDur = dur || data.data.durationSec || 120;
      setDurationSec(finalDur);
      const range = defaultTrimRange(finalDur);
      setStartSec(range.startSec);
      setEndSec(range.endSec);
      emitSelection({
        source: "upload",
        url: data.data.url,
        title: data.data.title ?? file.name,
        libraryTrackId: "",
        durationSec: finalDur,
        startSec: range.startSec,
        endSec: range.endSec,
      });
    } catch {
      setError("Could not process audio file.");
    } finally {
      setUploading(false);
    }
  }

  function adjustStart(sec: number) {
    const next = Math.max(0, Math.min(sec, endSec - 1));
    let newEnd = endSec;
    setStartSec(next);
    if (endSec - next > MUSIC_CLIP_MAX_SEC) {
      newEnd = next + MUSIC_CLIP_MAX_SEC;
      setEndSec(newEnd);
    }
    if (endSec - next < MUSIC_CLIP_MIN_SEC && durationSec >= MUSIC_CLIP_MIN_SEC) {
      newEnd = Math.min(next + MUSIC_CLIP_MIN_SEC, durationSec);
      setEndSec(newEnd);
    }
    emitSelection({ startSec: next, endSec: newEnd });
  }

  function adjustEnd(sec: number) {
    const maxEnd = durationSec > 0 ? durationSec : startSec + MUSIC_CLIP_MAX_SEC;
    let next = Math.min(sec, maxEnd);
    next = Math.max(next, startSec + 1);
    let newStart = startSec;
    if (next - startSec > MUSIC_CLIP_MAX_SEC) {
      newStart = next - MUSIC_CLIP_MAX_SEC;
      setStartSec(newStart);
    }
    if (next - startSec < MUSIC_CLIP_MIN_SEC) next = startSec + MUSIC_CLIP_MIN_SEC;
    setEndSec(next);
    emitSelection({ startSec: newStart, endSec: next });
  }

  function clearSelection() {
    stopPreview();
    setTrackUrl("");
    setTrackTitle("");
    setLibraryTrackId("");
    setDurationSec(0);
    setStartSec(0);
    setEndSec(MUSIC_CLIP_MAX_SEC);
    onChange(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-100 p-2.5">
          <Music className="h-5 w-5 text-brand-700" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-base font-semibold text-slate-900">Invitation music</Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose from Celeventic&apos;s library or upload your own. Select a 1–2 minute clip.
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-white border border-slate-200">
        {(["library", "upload"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => setTab(mode)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors touch-manipulation",
              tab === mode ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {mode === "library" ? "Celeventic library" : "Upload your own"}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <div className="space-y-2">
          {loadingLibrary ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tracks…
            </p>
          ) : library.length === 0 ? (
            <p className="text-sm text-slate-500 rounded-xl border border-dashed p-4 text-center">
              No library tracks yet — upload your own or ask admin to add music.
            </p>
          ) : (
            <ul className="grid gap-2 max-h-48 overflow-y-auto">
              {library.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void selectLibraryTrack(track)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2.5 transition-colors",
                      libraryTrackId === track.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 bg-white hover:border-brand-200"
                    )}
                  >
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {track.artist ? `${track.artist} · ` : ""}
                      {track.durationSec ? formatAudioTime(track.durationSec) : "—"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "upload" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 min-h-[44px]"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload audio (MP3, WAV, M4A — max 15MB)"}
          </Button>
        </>
      )}

      {trackUrl && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{trackTitle || "Selected track"}</p>
              <p className="text-xs text-slate-500">
                Full length: {durationSec ? formatAudioTime(durationSec) : "—"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="button" size="sm" variant="outline" onClick={togglePreview} disabled={!clipValid}>
                {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Start: {formatAudioTime(startSec)}</span>
                <span>End: {formatAudioTime(endSec)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(durationSec - 1, MUSIC_CLIP_MIN_SEC)}
                step={0.5}
                value={startSec}
                disabled={disabled || !durationSec}
                onChange={(e) => adjustStart(parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
              <Label className="text-xs text-slate-500">Set where music starts</Label>
            </div>
            <div>
              <input
                type="range"
                min={MUSIC_CLIP_MIN_SEC}
                max={Math.max(durationSec, startSec + MUSIC_CLIP_MIN_SEC)}
                step={0.5}
                value={endSec}
                disabled={disabled || !durationSec}
                onChange={(e) => adjustEnd(parseFloat(e.target.value))}
                className="w-full accent-brand-600"
              />
              <Label className="text-xs text-slate-500">Set where music ends</Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={clipValid ? "success" : "warning"}>
              Clip: {formatAudioTime(clipLen)} ({MUSIC_CLIP_MIN_SEC}–{MUSIC_CLIP_MAX_SEC}s)
            </Badge>
            {clipValid && !validationError && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
              </span>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <Label className="text-xs text-slate-600">Playback</Label>
            <div className="flex flex-wrap gap-2">
              {VOLUME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setVolume(preset.value);
                    emitSelection({ volume: preset.value });
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    volume === preset.value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 hover:border-brand-200"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fade in (sec)</Label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  disabled={disabled}
                  value={fadeInSec}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setFadeInSec(v);
                    emitSelection({ fadeInSec: v });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fade out (sec)</Label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  disabled={disabled}
                  value={fadeOutSec}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setFadeOutSec(v);
                    emitSelection({ fadeOutSec: v });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loop}
                  disabled={disabled}
                  onChange={(e) => {
                    setLoop(e.target.checked);
                    emitSelection({ loop: e.target.checked });
                  }}
                  className="rounded border-slate-300"
                />
                Loop
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  disabled={disabled}
                  onChange={(e) => {
                    setAutoPlay(e.target.checked);
                    emitSelection({ autoPlay: e.target.checked });
                  }}
                  className="rounded border-slate-300"
                />
                Auto play after reveal
              </label>
            </div>
          </div>
        </div>
      )}

      {(error || validationError) && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || validationError}
        </p>
      )}
    </div>
  );
}
