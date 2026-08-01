"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { THANK_YOU_TEMPLATES, getThankYouTemplate } from "@/lib/thank-you/templates";
import { THANK_YOU_FONT_PAIRINGS } from "@/lib/thank-you/font-pairings";
import { THANK_YOU_COPY_PRESETS } from "@/lib/thank-you/copy-presets";
import {
  DEFAULT_GUESTBOOK_CONFIG,
  DEFAULT_SECTION_CONFIG,
  DEFAULT_SHARING_CONFIG,
  type ThankYouSectionConfigItem,
  type ThankYouThemeSource,
} from "@/lib/thank-you/types";
import {
  parseGuestbookConfig,
  parseSectionConfig,
  resolveThankYouDesign,
} from "@/lib/thank-you/resolve-design";
import { ExternalLink, Send, Eye, QrCode, Download, ArrowUp, ArrowDown } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { ThankYouPublicView } from "@/components/thank-you/thank-you-public-view";
import { FormDraftStatusBar } from "@/components/forms/form-draft-status-bar";
import { isBlankFormDraft, readFormDraft, useFormDraft } from "@/hooks/use-form-draft";

interface ThankYouEditorProps {
  eventId: string;
  eventSlug: string;
}

type ThankYouForm = {
  templateId: string;
  themeSource: ThankYouThemeSource;
  title: string;
  message: string;
  eyebrow: string;
  subtitle: string;
  closingMessage: string;
  signatureLine: string;
  hostNames: string;
  eventHashtag: string;
  footerText: string;
  flyerUrl: string;
  hostPhotoUrl: string;
  heroImageUrl: string;
  audioUrl: string;
  fontPairingId: string;
  status: string;
  sectionConfig: ReturnType<typeof parseSectionConfig>;
  guestbookConfig: ReturnType<typeof parseGuestbookConfig>;
  sharingConfig: typeof DEFAULT_SHARING_CONFIG;
  featuredMemoryIds: string[];
};

const emptyForm = (): ThankYouForm => ({
  templateId: "eternal-ivory",
  themeSource: "INVITATION",
  title: "",
  message: "",
  eyebrow: "WITH HEARTFELT GRATITUDE",
  subtitle: "",
  closingMessage: "",
  signatureLine: "",
  hostNames: "",
  eventHashtag: "",
  footerText: "",
  flyerUrl: "",
  hostPhotoUrl: "",
  heroImageUrl: "",
  audioUrl: "",
  fontPairingId: "cormorant-inter",
  status: "DRAFT",
  sectionConfig: structuredClone(DEFAULT_SECTION_CONFIG),
  guestbookConfig: { ...DEFAULT_GUESTBOOK_CONFIG },
  sharingConfig: { ...DEFAULT_SHARING_CONFIG },
  featuredMemoryIds: [],
});

export function ThankYouEditor({ eventId, eventSlug }: ThankYouEditorProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [shareLinks, setShareLinks] = useState<{ thankYouUrl?: string; uploadUrl?: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [serverBaseline, setServerBaseline] = useState<ThankYouForm | null>(null);
  const [form, setForm] = useState<ThankYouForm>(emptyForm);
  const [hostName, setHostName] = useState("Host");
  const [eventTitle, setEventTitle] = useState("Your Event");
  const [moderation, setModeration] = useState<
    Array<{ id: string; authorName: string; message: string; status: string; source: string; isPinned: boolean; isFeatured: boolean }>
  >([]);
  const [moderationQuery, setModerationQuery] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  const draft = useFormDraft<ThankYouForm>({
    formId: "event-thank-you",
    userId,
    eventId,
    value: form,
    enabled: hydrated && sessionStatus !== "loading",
    restoreOnMount: false,
    debounceMs: 400,
    isEmpty: (v) => isBlankFormDraft(v, ["templateId", "status", "themeSource", "fontPairingId"]),
  });

  useEffect(() => {
    if (sessionStatus === "loading") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [tyRes, qrRes, msgRes] = await Promise.all([
        fetch(`/api/events/${eventId}/thank-you`),
        fetch(`/api/events/${eventId}/memory-qr/generate`),
        fetch(`/api/events/${eventId}/thank-you/messages?limit=40`),
      ]);
      const ty = await tyRes.json();
      const qr = await qrRes.json();
      const msgs = await msgRes.json();
      if (cancelled) return;

      if (ty.success) {
        const p = ty.data;
        setHostName(p.event?.hostName || "Host");
        setEventTitle(p.event?.title || "Your Event");
        const design = (p.designConfig ?? {}) as Record<string, unknown>;
        const serverForm: ThankYouForm = {
          templateId: p.templateId || "eternal-ivory",
          themeSource: (p.themeSource as ThankYouThemeSource) || "INVITATION",
          title: p.title ?? "",
          message: p.message ?? "",
          eyebrow: p.eyebrow ?? "WITH HEARTFELT GRATITUDE",
          subtitle: p.subtitle ?? "",
          closingMessage: p.closingMessage ?? "",
          signatureLine: p.signatureLine ?? "",
          hostNames: p.hostNames ?? p.event?.hostName ?? "",
          eventHashtag: p.eventHashtag ?? "",
          footerText: p.footerText ?? "",
          flyerUrl: p.flyerUrl ?? "",
          hostPhotoUrl: p.hostPhotoUrl ?? "",
          heroImageUrl: p.heroImageUrl ?? "",
          audioUrl: p.audioUrl ?? "",
          fontPairingId: String(design.fontPairingId || "cormorant-inter"),
          status: p.status,
          sectionConfig: parseSectionConfig(p.sectionConfig),
          guestbookConfig: parseGuestbookConfig(p.guestbookConfig),
          sharingConfig: { ...DEFAULT_SHARING_CONFIG, ...(p.sharingConfig as object) },
          featuredMemoryIds: Array.isArray(p.featuredMemoryIds) ? p.featuredMemoryIds : [],
        };
        setServerBaseline(serverForm);
        const saved = readFormDraft<ThankYouForm>({
          formId: "event-thank-you",
          userId,
          eventId,
        });
        if (
          saved &&
          !isBlankFormDraft(saved, ["templateId", "status", "themeSource", "fontPairingId"]) &&
          JSON.stringify(saved) !== JSON.stringify(serverForm)
        ) {
          setForm(saved);
          setRestoredFromDraft(true);
        } else {
          setForm(serverForm);
          setRestoredFromDraft(false);
        }
      }
      if (qr.success && qr.data?.qrImageUrl) setQrImageUrl(qr.data.qrImageUrl);
      if (msgs.success) setModeration(msgs.data.items ?? []);
      setHydrated(true);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, userId, sessionStatus]);

  function handleClearDraft() {
    draft.clearDraft();
    setRestoredFromDraft(false);
    if (serverBaseline) setForm(serverBaseline);
  }

  function applyCopyPreset(id: string) {
    const preset = THANK_YOU_COPY_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setForm((current) => ({
      ...current,
      eyebrow: preset.eyebrow,
      title: preset.title,
      message: preset.message,
      closingMessage: preset.closing,
      signatureLine: preset.signatureLine.replace("{Couple Names}", current.hostNames || hostName),
    }));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setForm((current) => {
      const sections = [...current.sectionConfig.sections].sort((a, b) => a.order - b.order);
      const index = sections.findIndex((section) => section.id === id);
      const swap = index + direction;
      if (index < 0 || swap < 0 || swap >= sections.length) return current;
      const next = [...sections];
      [next[index], next[swap]] = [next[swap]!, next[index]!];
      return {
        ...current,
        sectionConfig: {
          sections: next.map((section, order) => ({ ...section, order: order + 1 })),
        },
      };
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: form.templateId,
        themeSource: form.themeSource,
        title: form.title,
        message: form.message,
        eyebrow: form.eyebrow,
        subtitle: form.subtitle,
        closingMessage: form.closingMessage,
        signatureLine: form.signatureLine,
        hostNames: form.hostNames,
        eventHashtag: form.eventHashtag,
        footerText: form.footerText,
        flyerUrl: form.flyerUrl || null,
        hostPhotoUrl: form.hostPhotoUrl || null,
        heroImageUrl: form.heroImageUrl || null,
        audioUrl: form.audioUrl || null,
        designConfig: {
          themeSource: form.themeSource,
          templateId: form.templateId,
          fontPairingId: form.fontPairingId,
        },
        sectionConfig: form.sectionConfig,
        guestbookConfig: form.guestbookConfig,
        sharingConfig: form.sharingConfig,
        featuredMemoryIds: form.featuredMemoryIds,
      }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error);
    else {
      draft.clearDraft();
      setRestoredFromDraft(false);
      setForm((f) => {
        const next = { ...f, status: d.data.status };
        setServerBaseline(next);
        return next;
      });
    }
    setSaving(false);
  }

  async function togglePublish() {
    setPublishing(true);
    const unpublish = form.status === "PUBLISHED";
    const res = await fetch(`/api/events/${eventId}/thank-you/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unpublish }),
    });
    const d = await res.json();
    if (res.ok) setForm((f) => ({ ...f, status: d.data.status }));
    setPublishing(false);
  }

  async function getShareLinks() {
    const res = await fetch(`/api/events/${eventId}/thank-you/send`, { method: "POST" });
    const d = await res.json();
    if (d.success) setShareLinks(d.data);
  }

  async function moderate(messageId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/events/${eventId}/thank-you/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, ...patch }),
    });
    const d = await res.json();
    if (!res.ok) return;
    if (patch.hardDelete) {
      setModeration((current) => current.filter((item) => item.id !== messageId));
      return;
    }
    setModeration((current) =>
      current.map((item) => (item.id === messageId ? { ...item, ...d.data } : item))
    );
  }

  const template = getThankYouTemplate(form.templateId);
  const design = useMemo(
    () =>
      resolveThankYouDesign({
        templateId: form.templateId,
        themeSource: form.themeSource === "INVITATION" ? "PRESET" : form.themeSource,
        designConfig: {
          themeSource: form.themeSource,
          templateId: form.templateId,
          fontPairingId: form.fontPairingId,
        },
      }),
    [form.templateId, form.themeSource, form.fontPairingId]
  );

  const filteredModeration = moderation.filter((item) => {
    if (!moderationQuery.trim()) return true;
    const q = moderationQuery.toLowerCase();
    return (
      item.authorName.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  });

  const slug = eventSlug || "";

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Thank You Studio</h1>
          <p className="page-subtitle">
            Design a lasting digital home for appreciation, memories and guest messages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={form.status === "PUBLISHED" ? "default" : "outline"}>{form.status}</Badge>
          {slug && form.status === "PUBLISHED" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/events/${slug}/thank-you`} target="_blank">
                <ExternalLink className="h-4 w-4" /> View live
              </Link>
            </Button>
          )}
        </div>
      </div>

      <FormDraftStatusBar
        status={draft.status}
        hasDraft={draft.hasDraft}
        wasRestored={restoredFromDraft}
        lastSavedAt={draft.lastSavedAt}
        onClear={handleClearDraft}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Tabs defaultValue="content">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="theme">Theme & Fonts</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="messages">Guest Messages</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="publish">Publish & Share</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Copy presets</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {THANK_YOU_COPY_PRESETS.map((preset) => (
                <Button key={preset.id} size="sm" variant="outline" onClick={() => applyCopyPreset(preset.id)}>
                  {preset.label}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-3 pt-6 lg:grid-cols-2">
              <div className="space-y-1">
                <Label>Eyebrow</Label>
                <Input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Subtitle</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Gratitude letter</Label>
                <Textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Closing message</Label>
                <Textarea rows={3} value={form.closingMessage} onChange={(e) => setForm({ ...form, closingMessage: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Signature line</Label>
                <Input value={form.signatureLine} onChange={(e) => setForm({ ...form, signatureLine: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Host / couple names</Label>
                <Input value={form.hostNames} onChange={(e) => setForm({ ...form, hostNames: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Event hashtag</Label>
                <Input value={form.eventHashtag} onChange={(e) => setForm({ ...form, eventHashtag: e.target.value })} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Footer text</Label>
                <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...form.sectionConfig.sections]
                .sort((a, b) => a.order - b.order)
                .map((section: ThankYouSectionConfigItem) => (
                  <div key={section.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                    <label className="flex flex-1 items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            sectionConfig: {
                              sections: current.sectionConfig.sections.map((item) =>
                                item.id === section.id ? { ...item, enabled: e.target.checked } : item
                              ),
                            },
                          }))
                        }
                      />
                      {section.id}
                    </label>
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveSection(section.id, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => moveSection(section.id, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Theme source</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {(["INVITATION", "PRESET", "CUSTOM"] as ThankYouThemeSource[]).map((source) => (
                <label key={source} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.themeSource === source}
                    onChange={() => setForm({ ...form, themeSource: source })}
                  />
                  {source === "INVITATION"
                    ? "Use invitation theme"
                    : source === "PRESET"
                      ? "Use Thank You preset"
                      : "Customise this page"}
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Design templates</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {THANK_YOU_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      templateId: t.id,
                      fontPairingId: t.design.fontPairingId,
                      themeSource: form.themeSource === "INVITATION" ? "PRESET" : form.themeSource,
                    })
                  }
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    form.templateId === t.id ? "border-[#0B8A83] bg-teal-50" : "hover:border-slate-300"
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Font pairings</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {THANK_YOU_FONT_PAIRINGS.map((pairing) => (
                <button
                  key={pairing.id}
                  type="button"
                  onClick={() => setForm({ ...form, fontPairingId: pairing.id })}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    form.fontPairingId === pairing.id ? "border-[#0B8A83] bg-teal-50" : ""
                  }`}
                >
                  <p className="font-medium">{pairing.label}</p>
                  <p className="text-xs text-slate-500">{pairing.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
              <div className="space-y-1">
                <Label>Host / couple photo</Label>
                <ImageUploadCropper
                  defaultAspect="1:1"
                  allowedAspects={CROP_PRESETS.portrait}
                  previewUrl={form.hostPhotoUrl || null}
                  onClear={() => setForm({ ...form, hostPhotoUrl: "" })}
                  onUploaded={(r) => setForm({ ...form, hostPhotoUrl: r.url })}
                  buttonLabel="Upload photo"
                />
              </div>
              <div className="space-y-1">
                <Label>Hero image</Label>
                <ImageUploadCropper
                  defaultAspect="free"
                  allowedAspects={CROP_PRESETS.cover}
                  previewUrl={form.heroImageUrl || null}
                  onClear={() => setForm({ ...form, heroImageUrl: "" })}
                  onUploaded={(r) => setForm({ ...form, heroImageUrl: r.url })}
                  buttonLabel="Upload hero"
                />
              </div>
              <div className="space-y-1">
                <Label>Thank-you flyer</Label>
                <ImageUploadCropper
                  defaultAspect="free"
                  allowedAspects={CROP_PRESETS.cover}
                  previewUrl={form.flyerUrl || null}
                  onClear={() => setForm({ ...form, flyerUrl: "" })}
                  onUploaded={(r) => setForm({ ...form, flyerUrl: r.url })}
                  buttonLabel="Upload flyer"
                />
              </div>
              <div className="space-y-1">
                <Label>Background music URL</Label>
                <Input
                  value={form.audioUrl}
                  onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
                  placeholder="/uploads/... or https://..."
                />
                <p className="text-xs text-slate-500">Guests tap Play — never autoplays with sound.</p>
              </div>
              <div className="lg:col-span-2">
                <Button variant="outline" className="gap-2" asChild>
                  <Link href={`/dashboard/events/${eventId}/memories`}>
                    <QrCode className="h-4 w-4" /> Manage Memory Vault & featured uploads
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Guestbook settings</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["enabled", "Accept messages"],
                  ["requireApproval", "Require approval"],
                  ["allowAnonymous", "Allow anonymous"],
                  ["allowAvatar", "Allow profile photos"],
                  ["allowTitle", "Allow short headings"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.guestbookConfig[key])}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        guestbookConfig: { ...form.guestbookConfig, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <div className="space-y-1">
                <Label>Max message length</Label>
                <Input
                  type="number"
                  min={100}
                  max={1000}
                  value={form.guestbookConfig.maxMessageLength ?? 800}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      guestbookConfig: {
                        ...form.guestbookConfig,
                        maxMessageLength: Number(e.target.value) || 800,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Moderation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search author or message"
                value={moderationQuery}
                onChange={(e) => setModerationQuery(e.target.value)}
              />
              {filteredModeration.length === 0 ? (
                <p className="text-sm text-slate-500">No guest messages yet.</p>
              ) : (
                filteredModeration.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.authorName}</p>
                      <Badge variant="outline">{item.status}</Badge>
                      <Badge variant="secondary">{item.source}</Badge>
                      {item.isPinned && <Badge>Pinned</Badge>}
                      {item.isFeatured && <Badge>Featured</Badge>}
                    </div>
                    <p className="mt-2 text-slate-700">{item.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void moderate(item.id, { status: "APPROVED" })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void moderate(item.id, { status: "HIDDEN" })}>
                        Hide
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void moderate(item.id, { isPinned: !item.isPinned })}>
                        {item.isPinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void moderate(item.id, { isFeatured: !item.isFeatured })}>
                        {item.isFeatured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void moderate(item.id, { hardDelete: true })}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={previewDevice === "mobile" ? "default" : "outline"} onClick={() => setPreviewDevice("mobile")}>
              Mobile
            </Button>
            <Button size="sm" variant={previewDevice === "desktop" ? "default" : "outline"} onClick={() => setPreviewDevice("desktop")}>
              Desktop
            </Button>
          </div>
          <div className={`mx-auto overflow-hidden rounded-2xl border ${previewDevice === "mobile" ? "max-w-md" : "max-w-3xl"}`}>
            <ThankYouPublicView
              title={form.title}
              message={form.message}
              eyebrow={form.eyebrow}
              subtitle={form.subtitle}
              closingMessage={form.closingMessage}
              signatureLine={form.signatureLine}
              hostNames={form.hostNames}
              eventHashtag={form.eventHashtag}
              footerText={form.footerText}
              hostName={hostName}
              eventTitle={eventTitle}
              flyerUrl={form.flyerUrl}
              hostPhotoUrl={form.hostPhotoUrl}
              heroImageUrl={form.heroImageUrl}
              audioUrl={form.audioUrl}
              template={template}
              design={design}
              sectionConfig={form.sectionConfig}
              guestbookConfig={form.guestbookConfig}
              sharingConfig={form.sharingConfig}
              eventId={eventId}
              qrImageUrl={qrImageUrl ?? undefined}
              previewMode
            />
          </div>
        </TabsContent>

        <TabsContent value="publish" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Publish</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button variant="secondary" onClick={() => void togglePublish()} disabled={publishing}>
                {form.status === "PUBLISHED" ? "Unpublish" : "Publish thank-you page"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Share links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => void getShareLinks()} className="gap-2">
                <Eye className="h-4 w-4" /> Generate share links
              </Button>
              {shareLinks?.thankYouUrl && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <p>
                    <span className="font-medium">Thank-you URL:</span>{" "}
                    <a href={shareLinks.thankYouUrl} className="break-all text-[#0B8A83]" target="_blank" rel="noreferrer">
                      {shareLinks.thankYouUrl}
                    </a>
                  </p>
                  {shareLinks.uploadUrl && (
                    <p>
                      <span className="font-medium">Upload URL:</span>{" "}
                      <a href={shareLinks.uploadUrl} className="break-all text-[#0B8A83]" target="_blank" rel="noreferrer">
                        {shareLinks.uploadUrl}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {qrImageUrl && (
            <Card>
              <CardHeader><CardTitle className="text-base">Memory upload QR</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="Upload QR" className="mx-auto h-48 w-48 rounded-xl border bg-white p-2" />
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={`${qrImageUrl}&download=1`} download>
                    <Download className="h-4 w-4" /> Download QR
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
