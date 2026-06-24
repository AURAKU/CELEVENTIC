"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Link2,
  Upload,
  Trash2,
  ExternalLink,
  Music,
  ImageIcon,
  Video,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationBar } from "@/components/ui/pagination";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { useLocale } from "@/components/i18n/locale-provider";
import { AgiBadge } from "@/components/agi-engine/agi-badge";
import { AGI_COPY, AGI_ENGINE } from "@/lib/agi-engine/branding";
import { OUTPUT_TYPE_OPTIONS, PLATFORM_LABELS } from "@/lib/inspiration/inspiration-constants";
import { extractImagePalette } from "@/lib/extract-image-palette";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import type { InspirationEngineStatus, InspirationOutputType, InspirationPlatform } from "@prisma/client";

interface HistoryItem {
  id: string;
  title: string | null;
  platform: InspirationPlatform;
  status: InspirationEngineStatus;
  sourceUrl: string | null;
  createdAt: string;
  analysis?: { thumbnailUrl?: string | null; conceptSummary?: string | null; colorPalette?: string[] };
  generatedTemplates?: { id: string; name: string; designTemplateId: string | null }[];
}

const PROGRESS_LABELS: Record<string, string> = {
  PENDING: "Queued",
  ANALYZING: "Analyzing concept",
  EXTRACTING_COLORS: "Extracting colors",
  STUDYING_FLOW: "Studying layout flow",
  GENERATING_CONCEPT: "Generating Celeventic concept",
  READY: "Ready to edit",
  GENERATED: "Template created",
  FAILED: "Failed",
  BLOCKED: "Blocked",
  PENDING_REVIEW: "Pending review",
};

export function InspirationEngineClient() {
  const { t } = useLocale();
  const router = useRouter();
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();

  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<InspirationEngineStatus | null>(null);
  const [outputType, setOutputType] = useState<InspirationOutputType>("INVITATION");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<"image" | "video" | "audio" | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [audioTrim, setAudioTrim] = useState({ start: 0, end: 30, fadeIn: 1, fadeOut: 1, loop: true });
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const loadHistory = useCallback(async (p = page) => {
    const res = await fetch(`/api/inspiration/history?page=${p}&limit=20`);
    const d = await res.json();
    if (d.success) {
      setHistory(d.data.items);
      setPages(d.data.pages);
      setTotal(d.data.total);
    }
  }, [page]);

  useEffect(() => {
    loadHistory(page);
  }, [page, loadHistory]);

  useEffect(() => {
    if (!activeSourceId || !activeStatus) return;
    if (["READY", "GENERATED", "FAILED", "BLOCKED"].includes(activeStatus)) return;

    const timer = setInterval(async () => {
      const res = await fetch(`/api/inspiration/${activeSourceId}`);
      const d = await res.json();
      if (d.success) {
        setActiveStatus(d.data.status);
        if (["READY", "GENERATED", "FAILED", "BLOCKED"].includes(d.data.status)) {
          void loadHistory(page);
        }
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [activeSourceId, activeStatus, loadHistory, page]);

  async function analyzeUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError(t("inspiration.consent_required"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inspiration/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, eventId: eventId || undefined, consentConfirmed: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Analysis failed");
      setActiveSourceId(d.data.id);
      setActiveStatus(d.data.status);
      setUrl("");
      void loadHistory(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(file: File, kind: "image" | "video" | "audio", extra?: FormData) {
    if (!consent) {
      setError(t("inspiration.consent_required"));
      return;
    }
    setUploadingMedia(kind);
    setError("");
    const form = extra ?? new FormData();
    form.set("file", file);
    form.set("consentConfirmed", "true");
    if (eventId) form.set("eventId", eventId);

    try {
      if (kind === "image") {
        try {
          const palette = await extractImagePalette(URL.createObjectURL(file));
          form.set("colors", JSON.stringify(palette.colors));
          form.set("brightness", String(palette.brightness));
          form.set("aspectRatio", String(palette.aspectRatio));
        } catch { /* palette optional */ }
      }

      const result = await uploadFormDataWithProgress("/api/inspiration/upload", form, () => {});
      if (!result.ok) throw new Error((result.json as { error?: string }).error ?? "Upload failed");
      const d = result.json as { data: { id: string; status: InspirationEngineStatus; media?: { url: string }[]; sourceUrl?: string } };
      setActiveSourceId(d.data.id);
      setActiveStatus(d.data.status);
      if (kind === "audio") setAudioPreviewUrl(d.data.media?.[0]?.url ?? d.data.sourceUrl ?? null);
      void loadHistory(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingMedia(null);
    }
  }

  async function generateTemplate() {
    if (!activeSourceId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inspiration/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: activeSourceId, outputType }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Generation failed");
      setActiveStatus("GENERATED");
      void loadHistory(page);
      router.push(d.data.builderUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/inspiration/${id}`, { method: "DELETE" });
    if (activeSourceId === id) {
      setActiveSourceId(null);
      setActiveStatus(null);
    }
    void loadHistory(page);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#0B8A83]" />
            {t("inspiration.title")}
          </h1>
          <AgiBadge />
        </div>
        <p className="page-subtitle max-w-2xl">{t("inspiration.subtitle")}</p>
      </div>

      <Card className="border-[#0B8A83]/20 bg-gradient-to-br from-[#0B8A83]/5 to-transparent">
        <CardContent className="p-4 flex gap-3 items-start">
          <Shield className="h-5 w-5 text-[#0B8A83] shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">{t("inspiration.legal_notice")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} label={t("inspiration.link_event")} />
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-4 rounded-xl border bg-white">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B8A83]"
        />
        <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
          {t("inspiration.consent_label")}
        </Label>
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-100 px-4 py-3">{error}</p>
      )}

      {activeSourceId && activeStatus && !["GENERATED"].includes(activeStatus) && (
        <Card className="border-brand-200">
          <CardContent className="p-5 flex items-center gap-4">
            {!["READY", "FAILED", "BLOCKED"].includes(activeStatus) && (
              <Loader2 className="h-5 w-5 animate-spin text-[#0B8A83]" />
            )}
            <div>
              <p className="font-medium text-sm">{AGI_COPY.analyzing}</p>
              <p className="text-xs text-slate-500">{PROGRESS_LABELS[activeStatus] ?? activeStatus}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" /> {t("inspiration.paste_url")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={analyzeUrl} className="space-y-3">
              <Input
                placeholder="https://instagram.com/reel/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                required
              />
              <p className="text-xs text-slate-500">{t("inspiration.url_hint")}</p>
              <Button type="submit" className="w-full bg-[#0B8A83]" disabled={busy || !consent}>
                {busy ? AGI_COPY.analyzing : t("inspiration.analyze_btn")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> {t("inspiration.upload_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadCropper
              buttonLabel={t("inspiration.upload_image")}
              hint={t("inspiration.upload_image_hint")}
              defaultAspect="3:4"
              disabled={!consent || uploadingMedia !== null}
              onUploaded={async (r) => {
                const blob = await fetch(r.url).then((res) => res.blob());
                const file = new File([blob], r.name, { type: blob.type || "image/jpeg" });
                await uploadMedia(file, "image");
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!consent || uploadingMedia !== null}
                onClick={() => document.getElementById("insp-video-input")?.click()}
              >
                <Video className="h-4 w-4 mr-1.5" />
                {uploadingMedia === "video" ? t("forms.saving") : t("inspiration.upload_video")}
              </Button>
              <input
                id="insp-video-input"
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadMedia(f, "video");
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!consent || uploadingMedia !== null}
                onClick={() => document.getElementById("insp-audio-input")?.click()}
              >
                <Music className="h-4 w-4 mr-1.5" />
                {uploadingMedia === "audio" ? t("forms.saving") : t("inspiration.upload_audio")}
              </Button>
              <input
                id="insp-audio-input"
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadMedia(f, "audio");
                }}
              />
            </div>
            {audioPreviewUrl && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">{t("inspiration.audio_trim")}</Label>
                <audio src={audioPreviewUrl} controls className="w-full" loop={audioTrim.loop} />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px]">Start (s)</Label>
                    <Input type="number" min={0} value={audioTrim.start} onChange={(e) => setAudioTrim({ ...audioTrim, start: +e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">End (s)</Label>
                    <Input type="number" min={1} value={audioTrim.end} onChange={(e) => setAudioTrim({ ...audioTrim, end: +e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {activeStatus === "READY" && activeSourceId && (
        <Card className="border-[#D4A63A]/40 bg-[#D4A63A]/5">
          <CardContent className="p-6 flex flex-wrap items-end gap-4">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label>{t("inspiration.output_type")}</Label>
              <Select value={outputType} onValueChange={(v) => setOutputType(v as InspirationOutputType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTPUT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void generateTemplate()} disabled={busy} className="bg-[#0B8A83]">
              <Sparkles className="h-4 w-4" /> {t("inspiration.generate_btn")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("inspiration.history_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-slate-500 py-10">{t("inspiration.history_empty")}</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border bg-white">
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-teal-100 to-gold-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.analysis?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.analysis.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-medium text-sm">{item.title ?? PLATFORM_LABELS[item.platform]}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {PLATFORM_LABELS[item.platform]} · {PROGRESS_LABELS[item.status]}
                  </p>
                  {item.analysis?.conceptSummary && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.analysis.conceptSummary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.status === "GENERATED" ? "success" : "outline"}>{item.status}</Badge>
                  {item.generatedTemplates?.[0]?.designTemplateId && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/design-studio/builder/${item.generatedTemplates[0].designTemplateId}`}>
                        <ExternalLink className="h-3.5 w-3.5" /> Studio
                      </Link>
                    </Button>
                  )}
                  {item.status === "READY" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveSourceId(item.id);
                        setActiveStatus(item.status);
                      }}
                    >
                      {t("inspiration.generate_btn")}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => void deleteItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={setPage} />
        </CardContent>
      </Card>

      <p className="text-center text-[10px] text-slate-400 tracking-wide">
        {AGI_ENGINE.tagline} · {AGI_ENGINE.experience}
      </p>
    </div>
  );
}
