"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Copy, Check, Users, ExternalLink, Sparkles, Palette } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { TemplatePicker } from "@/components/invitation/template-picker";
import { MediaUploader } from "@/components/invitation/media-uploader";
import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import {
  INVITATION_TEMPLATE_PRESETS,
  getTemplatePreset,
} from "@/lib/invitation-templates";
import type { InvitationDesignConfig, InvitationMediaAsset } from "@/types/invitation-design";
import type { UploadAnalysisResult } from "@/services/invitations/invitation-inspiration.service";
import { InspirationInsights } from "@/components/invitation/inspiration-insights";

interface InvitationResult {
  id: string;
  name: string;
  shareUrl: string;
  uniqueLink: string;
}

interface InvitationListItem {
  id: string;
  name: string;
  uniqueLink: string;
  status: string;
  _count: { guests: number };
}

const BUILD_MODES = [
  { value: "template", label: "Use Template As-Is" },
  { value: "inspired", label: "Inspired By Upload" },
  { value: "similar", label: "Similar Style" },
  { value: "improved", label: "Improved & Enhanced" },
] as const;

export default function InvitationsPage() {
  const { events, eventId, setEventId, selectedEvent, loading: eventsLoading } = useEventContext();
  const [form, setForm] = useState({ name: "", message: "", introText: "" });
  const [layoutSlug, setLayoutSlug] = useState("classic-gold");
  const [buildMode, setBuildMode] = useState<InvitationDesignConfig["buildMode"]>("inspired");
  const [media, setMedia] = useState<InvitationMediaAsset[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<UploadAnalysisResult | null>(null);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/invitations?eventId=${eventId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInvitations(d.data); });
  }, [eventId, result]);

  useEffect(() => {
    if (!media.length || buildMode === "template") return;
    const primary = media[0];
    fetch("/api/invitations/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: primary.url, type: primary.type, name: primary.name, buildMode }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAiAnalysis(d.data);
          setLayoutSlug(d.data.suggestedLayout);
        }
      });
  }, [buildMode, media]);

  const designConfig = useMemo((): InvitationDesignConfig => {
    if (aiAnalysis && media.length > 0 && buildMode !== "template") {
      return {
        ...aiAnalysis.designConfig,
        media,
        introText: form.introText || aiAnalysis.designConfig.introText,
        buildMode,
      };
    }

    const preset = getTemplatePreset(layoutSlug) ?? INVITATION_TEMPLATE_PRESETS[0];
    let config = { ...preset.config, introText: form.introText || preset.config.introText, media, buildMode };

    if (media.length > 0 && buildMode === "template") {
      config = { ...config, layout: layoutSlug as typeof config.layout };
    }

    return config;
  }, [layoutSlug, form.introText, media, buildMode, aiAnalysis]);

  const previewEvent = useMemo(() => ({
    title: selectedEvent?.title,
    hostName: undefined,
    startDate: selectedEvent?.startDate,
    startDateRaw: selectedEvent?.startDate,
    venueName: undefined,
    landmark: undefined,
    coverImageUrl: media.find((m) => m.type === "image")?.url ?? null,
  }), [selectedEvent, media]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) { setError("Please select an event"); return; }
    if (!form.name.trim()) { setError("Invitation name is required"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: form.name.trim(),
        message: form.message.trim() || undefined,
        designConfig,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult(data.data);
      setForm({ name: "", message: "", introText: "" });
      setMedia([]);
      setAiAnalysis(null);
      setLayoutSlug("classic-gold");
    } else {
      setError(data.error || "Failed to create invitation");
    }
    setLoading(false);
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-600" /> Invitation Studio
        </h1>
        <p className="page-subtitle">
          Design premium wedding invitations — pick a template, upload your sample image, PDF, or video, and build upon it.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-brand-600" /> Choose Design Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatePicker
                templates={INVITATION_TEMPLATE_PRESETS}
                selected={layoutSlug}
                onSelect={setLayoutSlug}
                disabled={!eventId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Sample (Image, PDF, or Video)</CardTitle>
              <p className="text-xs text-slate-500">Use your own design as hero, background, or downloadable attachment</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUploader
                assets={media}
                onChange={setMedia}
                onAnalysis={(a) => {
                  setAiAnalysis(a);
                  if (a) {
                    setLayoutSlug(a.suggestedLayout);
                    setBuildMode("inspired");
                  }
                }}
                buildMode={buildMode}
                disabled={!eventId}
              />
              <InspirationInsights analysis={aiAnalysis} />
              {media.length > 0 && (
                <div className="space-y-2">
                  <Label>Build Mode</Label>
                  <Select value={buildMode} onValueChange={(v) => setBuildMode(v as typeof buildMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUILD_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-brand-600" /> Invitation Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Invitation Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Wedding Invitation - Main"
                    required
                    disabled={!eventId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Intro Line</Label>
                  <Input
                    value={form.introText}
                    onChange={(e) => setForm({ ...form, introText: e.target.value })}
                    placeholder="together with their families"
                    disabled={!eventId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Personal Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="You are cordially invited to celebrate with us..."
                    rows={3}
                    disabled={!eventId}
                  />
                </div>
                <Button type="submit" disabled={loading || !eventId} className="w-full">
                  {loading ? "Creating..." : "Generate Premium Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-700">Preview</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? "Hide" : "Show"}
            </Button>
          </div>
          {showPreview && eventId && (
            <InvitationStudioPreview
              design={designConfig}
              event={previewEvent}
              message={form.message}
              invitationName={form.name || "Your Invitation"}
            />
          )}
          {!eventId && (
            <Card><CardContent className="py-16 text-center text-slate-500 text-sm">Select an event to preview your design</CardContent></Card>
          )}
        </div>
      </div>

      {result && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="p-6 space-y-4">
            <p className="font-medium text-brand-800">Premium Invitation Created!</p>
            <div className="flex items-center gap-2">
              <Input value={result.shareUrl} readOnly className="bg-white" />
              <Button size="icon" variant="outline" onClick={() => copyLink(result.shareUrl)}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="outline" asChild>
                <a href={result.shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/guests?eventId=${eventId}`}>
                  <Users className="h-4 w-4" /> Add Guests
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={result.shareUrl} target="_blank" rel="noopener noreferrer">Preview Invitation</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {invitations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Existing Invitations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((inv) => {
              const shareUrl = `${appUrl}/invite/${inv.uniqueLink}`;
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{inv.name}</p>
                    <p className="text-xs text-slate-500">{inv._count.guests} guests</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{inv.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(shareUrl)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer">View</a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
