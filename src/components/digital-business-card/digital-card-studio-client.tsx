"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Nfc,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DIGITAL_CARD_THEMES, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import {
  DIGITAL_CARD_MONTHLY_PRICE_GHS,
  DIGITAL_CARD_TRIAL_DAYS,
  digitalCardPublicUrl,
  normalizeSocials,
  type DigitalCardSocials,
} from "@/lib/digital-business-card/types";

type CardRow = {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: unknown;
  themeId: string;
  avatarUrl: string | null;
  isPublished: boolean;
  nfcEnabled: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  viewCount: number;
  isLive: boolean;
};

const emptyForm = {
  displayName: "",
  title: "",
  company: "",
  bio: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  instagram: "",
  whatsapp: "",
  themeId: "elegant-frost" as DigitalCardThemeId,
  slug: "",
  isPublished: true,
  nfcEnabled: true,
};

export function DigitalCardStudioClient() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const list = (json.data ?? []) as CardRow[];
      setCards(list);
      if (list.length && !activeId) {
        selectCard(list[0]);
      } else if (activeId) {
        const found = list.find((c) => c.id === activeId);
        if (found) selectCard(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function selectCard(card: CardRow) {
    setActiveId(card.id);
    const socials = normalizeSocials(card.socials);
    setForm({
      displayName: card.displayName,
      title: card.title ?? "",
      company: card.company ?? "",
      bio: card.bio ?? "",
      email: card.email ?? "",
      phone: card.phone ?? "",
      website: card.website ?? "",
      linkedin: socials.linkedin ?? "",
      instagram: socials.instagram ?? "",
      whatsapp: socials.whatsapp ?? "",
      themeId: (card.themeId as DigitalCardThemeId) || "elegant-frost",
      slug: card.slug,
      isPublished: card.isPublished,
      nfcEnabled: card.nfcEnabled,
    });
  }

  const active = useMemo(() => cards.find((c) => c.id === activeId) ?? null, [cards, activeId]);
  const publicUrl = form.slug ? digitalCardPublicUrl(form.slug, origin) : "";
  const qrSrc = publicUrl ? `/api/qr/image?data=${encodeURIComponent(publicUrl)}&size=512` : null;

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const socials: DigitalCardSocials = {};
    if (form.linkedin.trim()) socials.linkedin = form.linkedin.trim();
    if (form.instagram.trim()) socials.instagram = form.instagram.trim();
    if (form.whatsapp.trim()) socials.whatsapp = form.whatsapp.trim();
    if (form.website.trim()) socials.website = form.website.trim();

    const payload = {
      displayName: form.displayName.trim(),
      title: form.title.trim() || null,
      company: form.company.trim() || null,
      bio: form.bio.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      socials,
      themeId: form.themeId,
      slug: form.slug.trim() || undefined,
      isPublished: form.isPublished,
      nfcEnabled: form.nfcEnabled,
    };

    try {
      const res = await fetch(
        activeId ? `/api/digital-business-cards/${activeId}` : "/api/digital-business-cards",
        {
          method: activeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMessage(activeId ? "Card updated." : "Card created — 14-day trial started.");
      await load();
      if (!activeId && json.data?.id) {
        setActiveId(json.data.id);
        selectCard(json.data as CardRow);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function renew() {
    if (!activeId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewSubscription: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Renew failed");
      setMessage("Subscription renewed for 30 days. Your link stays live.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Renew failed");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function startNew() {
    setActiveId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 text-[#0B8A83]">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Digital business card</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            One link for every contact
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Design a premium card, connect LinkedIn, website, WhatsApp and more, then share via QR or
            NFC. A monthly plan keeps your public page live for anyone you meet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" />
            New card
          </Button>
          <Button type="button" onClick={save} disabled={saving || form.displayName.trim().length < 2}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <strong>₵{DIGITAL_CARD_MONTHLY_PRICE_GHS}/month</strong> keeps your card link active. New cards
        include a {DIGITAL_CARD_TRIAL_DAYS}-day trial. Renew anytime to stay discoverable.
        {active ? (
          <span className="ml-2">
            Status:{" "}
            <Badge variant="secondary" className="align-middle">
              {active.subscriptionStatus}
              {active.isLive ? " · live" : " · offline"}
            </Badge>
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#0B8A83]">{message}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {cards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCard(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      c.id === activeId
                        ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c.displayName}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Ama Mensah"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title / role</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Founder & Creative Director"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Aura Group"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">About</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="One short line about what you do."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={form.linkedin}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                  placeholder="profile URL or username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="233…"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="slug">Public link slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="ama-mensah"
                  />
                  {publicUrl ? (
                    <Button type="button" variant="outline" onClick={copyLink}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  ) : null}
                </div>
                {publicUrl ? (
                  <p className="text-xs text-slate-500 break-all">{publicUrl}</p>
                ) : (
                  <p className="text-xs text-slate-500">Saved as /card/your-slug</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Theme</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DIGITAL_CARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, themeId: t.id }))}
                    className={`rounded-xl border p-2 text-left transition ${
                      form.themeId === t.id
                        ? "border-[#0B8A83] ring-2 ring-[#0B8A83]/25"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className="mb-2 h-12 rounded-lg"
                      style={{ background: t.cardBackground, border: `1px solid ${t.border}` }}
                    />
                    <p className="text-xs font-semibold text-slate-800">{t.previewLabel}</p>
                    {t.premium ? (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700">Premium</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.nfcEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, nfcEnabled: e.target.checked }))}
                />
                <Nfc className="h-4 w-4 text-slate-500" />
                NFC ready
              </label>
            </div>
          </div>

          <aside className="space-y-4">
            <div
              className="rounded-2xl p-4"
              style={{
                background: DIGITAL_CARD_THEMES.find((t) => t.id === form.themeId)?.stageBackground,
              }}
            >
              <DigitalCardFace
                themeId={form.themeId}
                displayName={form.displayName || "Your name"}
                title={form.title || "Your title"}
                company={form.company || "Company"}
                qrSrc={qrSrc}
                compact
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Smart share</p>
              <p className="text-xs text-slate-600">
                QR opens your one-stop page. NFC writes the same URL to a tag (Chrome Android) or copy
                the link into any NFC writer.
              </p>
              <div className="flex flex-col gap-2">
                {publicUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={digitalCardPublicUrl(form.slug)} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open live page
                    </Link>
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={copyLink} disabled={!publicUrl}>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Copy for NFC / share
                </Button>
                {activeId ? (
                  <Button type="button" size="sm" className="bg-[#0B8A83] hover:bg-[#097a74]" onClick={renew}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Renew 30 days (₵{DIGITAL_CARD_MONTHLY_PRICE_GHS})
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/settings?tab=billing">Manage billing</Link>
                </Button>
              </div>
              {active ? (
                <p className="text-[11px] text-slate-500">{active.viewCount} profile views</p>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
