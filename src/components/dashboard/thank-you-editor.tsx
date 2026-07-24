"use client";

import { useEffect, useState } from "react";
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
import { THANK_YOU_TEMPLATES } from "@/lib/thank-you/templates";
import { ExternalLink, Send, Eye, QrCode, Download } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { ThankYouPublicView } from "@/components/memory/public-memories-gallery";
import { FormDraftStatusBar } from "@/components/forms/form-draft-status-bar";
import { isBlankFormDraft, readFormDraft, useFormDraft } from "@/hooks/use-form-draft";

interface ThankYouEditorProps {
  eventId: string;
  eventSlug: string;
}

interface ThankYouData {
  id: string;
  templateId: string;
  title: string | null;
  message: string | null;
  flyerUrl: string | null;
  hostPhotoUrl: string | null;
  audioUrl: string | null;
  status: string;
  shareToken: string | null;
  event?: { slug: string; title: string; hostName: string };
}

type ThankYouForm = {
  templateId: string;
  title: string;
  message: string;
  flyerUrl: string;
  hostPhotoUrl: string;
  audioUrl: string;
  status: string;
};

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
  const [form, setForm] = useState<ThankYouForm>({
    templateId: "luxury-wedding",
    title: "",
    message: "",
    flyerUrl: "",
    hostPhotoUrl: "",
    audioUrl: "",
    status: "DRAFT",
  });

  const draft = useFormDraft<ThankYouForm>({
    formId: "event-thank-you",
    userId,
    eventId,
    value: form,
    enabled: hydrated && sessionStatus !== "loading",
    restoreOnMount: false,
    debounceMs: 400,
    isEmpty: (v) => isBlankFormDraft(v, ["templateId", "status"]),
  });

  useEffect(() => {
    if (sessionStatus === "loading") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [tyRes, qrRes] = await Promise.all([
        fetch(`/api/events/${eventId}/thank-you`),
        fetch(`/api/events/${eventId}/memory-qr/generate`),
      ]);
      const ty = await tyRes.json();
      const qr = await qrRes.json();
      if (cancelled) return;

      if (ty.success) {
        const p = ty.data as ThankYouData;
        const serverForm: ThankYouForm = {
          templateId: p.templateId,
          title: p.title ?? "",
          message: p.message ?? "",
          flyerUrl: p.flyerUrl ?? "",
          hostPhotoUrl: p.hostPhotoUrl ?? "",
          audioUrl: p.audioUrl ?? "",
          status: p.status,
        };
        setServerBaseline(serverForm);
        const saved = readFormDraft<ThankYouForm>({
          formId: "event-thank-you",
          userId,
          eventId,
        });
        if (
          saved &&
          !isBlankFormDraft(saved, ["templateId", "status"]) &&
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

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: form.templateId,
        title: form.title,
        message: form.message,
        flyerUrl: form.flyerUrl || null,
        hostPhotoUrl: form.hostPhotoUrl || null,
        audioUrl: form.audioUrl || null,
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

  const template = THANK_YOU_TEMPLATES.find((t) => t.id === form.templateId) ?? THANK_YOU_TEMPLATES[0];
  const slug = eventSlug || "";

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Thank You Page</h1>
          <p className="page-subtitle">Design and publish your post-event thank-you experience.</p>
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

      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="share">Share & QR</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Template</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-2">
              {THANK_YOU_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, templateId: t.id })}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    form.templateId === t.id ? "border-[#0B8A83] bg-teal-50" : "hover:border-slate-300"
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Content</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Thank-you message</Label>
                  <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Host / couple photo</Label>
                  <ImageUploadCropper
                    defaultAspect="free"
                    allowedAspects={CROP_PRESETS.portrait}
                    previewUrl={form.hostPhotoUrl || null}
                    onClear={() => setForm({ ...form, hostPhotoUrl: "" })}
                    onUploaded={(r) => setForm({ ...form, hostPhotoUrl: r.url })}
                    buttonLabel="Upload photo"
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save draft"}
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => void togglePublish()} disabled={publishing}>
                  {form.status === "PUBLISHED" ? "Unpublish" : "Publish thank-you page"}
                </Button>
                <Button className="w-full gap-2" variant="outline" asChild>
                  <Link href={`/dashboard/events/${eventId}/memories`}>
                    <QrCode className="h-4 w-4" /> Manage memories
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="rounded-2xl border overflow-hidden max-w-md mx-auto">
            <ThankYouPublicView
              title={form.title}
              message={form.message}
              hostName="Host"
              eventTitle={form.title || "Your Event"}
              flyerUrl={form.flyerUrl}
              hostPhotoUrl={form.hostPhotoUrl}
              audioUrl={form.audioUrl}
              template={template}
              qrImageUrl={qrImageUrl ?? undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="share" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Share links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => void getShareLinks()} className="gap-2">
                <Eye className="h-4 w-4" /> Generate share links
              </Button>
              {shareLinks?.thankYouUrl && (
                <div className="text-sm space-y-2 p-3 rounded-lg bg-slate-50">
                  <p><span className="font-medium">Thank-you URL:</span> <a href={shareLinks.thankYouUrl} className="text-[#0B8A83] break-all" target="_blank" rel="noreferrer">{shareLinks.thankYouUrl}</a></p>
                  {shareLinks.uploadUrl && (
                    <p><span className="font-medium">Upload URL:</span> <a href={shareLinks.uploadUrl} className="text-[#0B8A83] break-all" target="_blank" rel="noreferrer">{shareLinks.uploadUrl}</a></p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {qrImageUrl && (
            <Card>
              <CardHeader><CardTitle className="text-base">Memory upload QR</CardTitle></CardHeader>
              <CardContent className="text-center space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="Upload QR" className="w-48 h-48 mx-auto rounded-xl border bg-white p-2" />
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
