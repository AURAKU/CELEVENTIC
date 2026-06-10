"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/page-loader";
import { useLocale } from "@/components/i18n/locale-provider";
import { AiCreatorPanel } from "@/components/invitation-os/ai-creator-panel";
import { InspirationUploadPanel } from "@/components/invitation-os/inspiration-upload-panel";
import type { AiCreatorOutput } from "@/services/invitation-os/ai-invitation-creator.service";

type LanguageMode = "EN_ONLY" | "FR_ONLY" | "EN_FR";

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    eventType: "WEDDING",
    hostName: "",
    coupleName1: "",
    coupleName2: "",
    deceasedName: "",
    eventTitle: "",
    eventTitleFr: "",
    eventDate: "",
    eventTime: "",
    venueName: "",
    landmark: "",
    mapsLink: "",
    dressCode: "",
    contactPhone: "",
    contactEmail: "",
    story: "",
    storyFr: "",
    musicPreference: "",
    rsvpRequired: true,
    guestCount: "",
    galleryUrls: "",
    languageMode: "EN_FR" as LanguageMode,
  });

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then(async (d) => {
        if (d.success) {
          const o = d.data;
          let eventTitleFr = "";
          let storyFr = "";
          const versions = o.languageVersions as { languageCode: string; eventTitle?: string; story?: string }[] | undefined;
          const frVersion = versions?.find((v) => v.languageCode === "fr");
          if (frVersion) {
            eventTitleFr = frVersion.eventTitle ?? "";
            storyFr = frVersion.story ?? "";
          }
          setForm({
            eventType: o.eventType ?? "WEDDING",
            hostName: o.hostName ?? "",
            coupleName1: o.coupleName1 ?? "",
            coupleName2: o.coupleName2 ?? "",
            deceasedName: o.deceasedName ?? "",
            eventTitle: o.eventTitle ?? "",
            eventTitleFr,
            eventDate: o.eventDate ? o.eventDate.split("T")[0] : "",
            eventTime: o.eventTime ?? "",
            venueName: o.venueName ?? "",
            landmark: o.landmark ?? "",
            mapsLink: o.mapsLink ?? "",
            dressCode: o.dressCode ?? "",
            contactPhone: o.contactPhone ?? "",
            contactEmail: o.contactEmail ?? "",
            story: o.story ?? "",
            storyFr,
            musicPreference: o.musicPreference ?? "",
            rsvpRequired: o.rsvpRequired ?? true,
            guestCount: o.guestCount?.toString() ?? "",
            galleryUrls: Array.isArray(o.galleryUrls) ? o.galleryUrls.join("\n") : "",
            languageMode: o.languageMode ?? "EN_FR",
          });
        }
        setLoading(false);
      });
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const galleryUrls = form.galleryUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    const res = await fetch(`/api/invitation-orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        guestCount: form.guestCount ? parseInt(form.guestCount, 10) : undefined,
        galleryUrls,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      router.push(`/invitations/create/${orderId}/addons`);
    } else {
      setError(data.error || t("forms.save_failed"));
    }
  }

  function applyAiContent(content: AiCreatorOutput) {
    setForm((prev) => ({
      ...prev,
      eventTitle: content.eventTitle || prev.eventTitle,
      eventTitleFr: content.eventTitleFr || prev.eventTitleFr,
      story: content.story || prev.story,
      storyFr: content.storyFr || prev.storyFr,
      dressCode: content.dressCodeSuggestion || prev.dressCode,
      hostName: content.hostLine || prev.hostName,
    }));
  }

  if (loading) return <PageLoader label={t("common.loading")} className="min-h-screen" />;

  const isWedding = form.eventType === "WEDDING" || form.eventType === "ENGAGEMENT";
  const isFuneral = form.eventType === "FUNERAL";
  const showFrench = form.languageMode === "EN_FR" || form.languageMode === "FR_ONLY";

  return (
    <MvpShell step={1} title={t("forms.event_details_title")} subtitle={t("forms.event_details_subtitle")}>
      <div className="max-w-2xl mx-auto grid lg:grid-cols-2 gap-6 mb-6">
        <AiCreatorPanel orderId={orderId} eventType={form.eventType} onApply={applyAiContent} />
        <InspirationUploadPanel orderId={orderId} />
      </div>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}

        <div>
          <Label>{t("forms.language_mode")}</Label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.languageMode}
            onChange={(e) => setForm({ ...form, languageMode: e.target.value as LanguageMode })}
          >
            <option value="EN_ONLY">{t("forms.lang_en_only")}</option>
            <option value="FR_ONLY">{t("forms.lang_fr_only")}</option>
            <option value="EN_FR">{t("forms.lang_en_fr")}</option>
          </select>
        </div>

        {isWedding && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>{t("forms.partner_1")}</Label><Input value={form.coupleName1} onChange={(e) => setForm({ ...form, coupleName1: e.target.value })} /></div>
            <div><Label>{t("forms.partner_2")}</Label><Input value={form.coupleName2} onChange={(e) => setForm({ ...form, coupleName2: e.target.value })} /></div>
          </div>
        )}
        {isFuneral && (
          <div><Label>{t("forms.deceased_name")}</Label><Input value={form.deceasedName} onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} /></div>
        )}
        <div><Label>{t("forms.host_name")}</Label><Input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} /></div>
        <div><Label>{t("forms.event_title")}</Label><Input value={form.eventTitle} onChange={(e) => setForm({ ...form, eventTitle: e.target.value })} required /></div>
        {showFrench && (
          <div><Label>{t("forms.event_title_fr")}</Label><Input value={form.eventTitleFr} onChange={(e) => setForm({ ...form, eventTitleFr: e.target.value })} /></div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>{t("forms.date")}</Label><Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required /></div>
          <div><Label>{t("forms.time")}</Label><Input type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} /></div>
        </div>
        <div><Label>{t("forms.venue")}</Label><Input value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} /></div>
        <div><Label>{t("forms.landmark")}</Label><Input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></div>
        <div><Label>{t("forms.maps_link")}</Label><Input value={form.mapsLink} onChange={(e) => setForm({ ...form, mapsLink: e.target.value })} placeholder="https://maps.google.com/..." /></div>
        <div><Label>{t("forms.dress_code")}</Label><Input value={form.dressCode} onChange={(e) => setForm({ ...form, dressCode: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>{t("forms.contact_phone")}</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
          <div><Label>{t("forms.contact_email")}</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        </div>
        <div><Label>{t("forms.story")}</Label><Textarea rows={4} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} /></div>
        {showFrench && (
          <div><Label>{t("forms.story_fr")}</Label><Textarea rows={4} value={form.storyFr} onChange={(e) => setForm({ ...form, storyFr: e.target.value })} /></div>
        )}
        <div><Label>{t("forms.gallery_urls")}</Label><Textarea rows={3} value={form.galleryUrls} onChange={(e) => setForm({ ...form, galleryUrls: e.target.value })} placeholder="https://..." /></div>
        <div><Label>{t("forms.music_preference")}</Label><Input value={form.musicPreference} onChange={(e) => setForm({ ...form, musicPreference: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>{t("forms.expected_guests")}</Label><Input type="number" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-8">
            <input type="checkbox" id="rsvp" checked={form.rsvpRequired} onChange={(e) => setForm({ ...form, rsvpRequired: e.target.checked })} />
            <Label htmlFor="rsvp">{t("forms.rsvp_required")}</Label>
          </div>
        </div>
        <Button type="submit" className="w-full bg-[#0B8A83] hover:bg-[#097068]" size="lg" disabled={saving}>
          {saving ? t("forms.saving") : t("forms.continue_addons")}
        </Button>
      </form>
    </MvpShell>
  );
}
