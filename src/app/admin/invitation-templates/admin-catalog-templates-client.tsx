"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Eye, EyeOff, Copy, Archive, RotateCcw, Trash2, Shield, ScrollText } from "lucide-react";
import { TemplateMediaUpload } from "@/components/admin/template-media-upload";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";
import { AdminInvitationExperienceControls } from "./admin-invitation-experience-controls";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { OPENING_EXPERIENCES } from "@/lib/experience/opening-experiences";
import { TYPOGRAPHY_PACKS } from "@/lib/experience/typography-engine";
import { EXTENDED_BUTTON_STYLES } from "@/lib/invitation/invitation-button-styles";

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  style: string;
  layoutSlug: string;
  previewGradient: string | null;
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  motionReferenceUrl?: string | null;
  inspirationMediaUrl?: string | null;
  defaultGalleryUrls?: string[] | null;
  eventTypes?: string[] | null;
  packageSlugs?: string[] | null;
  priceGhs: string | number | null;
  languages: string[] | null;
  isPremium: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

interface UniquenessReport {
  score: number;
  overlapping: string[];
  suggestions: string[];
  hasAdminOverride?: boolean;
}

const emptyForm = {
  slug: "", name: "", description: "", category: "Wedding", style: "Luxury",
  layoutSlug: "classic-gold", previewGradient: "", previewImageUrl: "", previewVideoUrl: "",
  backgroundImageUrl: "", backgroundVideoUrl: "", motionReferenceUrl: "", inspirationMediaUrl: "",
  defaultGalleryUrls: [] as string[],
  eventTypes: "WEDDING,BIRTHDAY", packageSlugs: "starter,celebration,signature",
  priceGhs: 0, languages: "en,fr", isPremium: false, isFeatured: false, isActive: true,
};

const emptyCreative = {
  revealMechanic: "",
  openingExperience: "",
  motionProfile: "",
  parallaxProfile: "moderate",
  typographySystem: "",
  buttonFamily: "",
  defaultAudioTrack: "",
  outroType: "",
  sceneTransition: "fade",
  notes: "",
};

const PARALLAX_OPTIONS = ["none", "subtle", "moderate", "cinematic", "interactive"] as const;
const MOTION_OPTIONS = ["cinematic", "elegant", "playful", "solemn", "energetic", "minimal"] as const;
const SCENE_TRANSITIONS = ["fade", "slide", "curtain", "door", "book", "sparkle"] as const;
const OUTRO_OPTIONS = [
  "thank-you-fade",
  "fireworks",
  "lanterns",
  "butterflies",
  "rose-petals",
  "golden-sparkles",
  "closing-curtain",
  "memory-slideshow",
  "final-quote",
  "see-you-soon",
  "upload-memories",
  "none",
] as const;

export function AdminCatalogTemplatesClient() {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creativeSlug, setCreativeSlug] = useState<string | null>(null);
  const [creative, setCreative] = useState(emptyCreative);
  const [uniqueness, setUniqueness] = useState<Record<string, UniquenessReport>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    const res = await fetch(`/api/admin/invitation-templates?${params}`);
    const d = await res.json();
    if (d.success) {
      setTemplates(d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
  }, [appendToParams]);

  useEffect(() => { load(); }, [load]);

  async function loadUniqueness(slug: string) {
    const res = await fetch(`/api/admin/invitation-templates?uniqueness=${encodeURIComponent(slug)}`);
    const d = await res.json();
    if (d.success) {
      setUniqueness((prev) => ({ ...prev, [slug]: d.data.report }));
      if (d.data.override) {
        setCreative({
          revealMechanic: d.data.override.revealMechanic ?? "",
          openingExperience: d.data.override.openingExperience ?? "",
          motionProfile: d.data.override.motionProfile ?? "",
          parallaxProfile: d.data.override.parallaxProfile ?? "moderate",
          typographySystem: d.data.override.typographySystem ?? "",
          buttonFamily: d.data.override.buttonFamily ?? "",
          defaultAudioTrack: d.data.override.defaultAudioTrack ?? "",
          outroType: d.data.override.outroType ?? "",
          sceneTransition: d.data.override.sceneTransition ?? "fade",
          notes: d.data.override.notes ?? "",
        });
      }
    }
  }

  function startEdit(t: TemplateRow) {
    setEditId(t.id);
    setForm({
      slug: t.slug, name: t.name, description: t.description ?? "",
      category: t.category, style: t.style, layoutSlug: t.layoutSlug,
      previewGradient: t.previewGradient ?? "", previewImageUrl: t.previewImageUrl ?? "",
      previewVideoUrl: t.previewVideoUrl ?? "", backgroundImageUrl: t.backgroundImageUrl ?? "",
      backgroundVideoUrl: t.backgroundVideoUrl ?? "", motionReferenceUrl: t.motionReferenceUrl ?? "",
      inspirationMediaUrl: t.inspirationMediaUrl ?? "",
      defaultGalleryUrls: Array.isArray(t.defaultGalleryUrls) ? (t.defaultGalleryUrls as string[]) : [],
      eventTypes: Array.isArray(t.eventTypes) ? (t.eventTypes as string[]).join(",") : "WEDDING",
      packageSlugs: Array.isArray(t.packageSlugs) ? (t.packageSlugs as string[]).join(",") : "",
      priceGhs: Number(t.priceGhs ?? 0),
      languages: Array.isArray(t.languages) ? (t.languages as string[]).join(",") : "en,fr",
      isPremium: t.isPremium, isFeatured: t.isFeatured, isActive: t.isActive,
    });
    setShowForm(true);
    void loadUniqueness(t.slug);
  }

  async function save() {
    await fetch("/api/admin/invitation-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId ?? undefined,
        ...form,
        priceGhs: Number(form.priceGhs),
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
        eventTypes: form.eventTypes.split(",").map((l) => l.trim()).filter(Boolean),
        packageSlugs: form.packageSlugs.split(",").map((l) => l.trim()).filter(Boolean),
        defaultGalleryUrls: form.defaultGalleryUrls,
      }),
    });
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    load();
  }

  async function toggle(id: string, field: "isFeatured" | "isActive", value: boolean) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    await fetch("/api/admin/invitation-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, slug: t.slug, name: t.name, category: t.category, style: t.style, layoutSlug: t.layoutSlug, [field]: value }),
    });
    load();
  }

  async function runAction(id: string, action: "duplicate" | "archive" | "restore" | "hard-delete") {
    setBusyId(id);
    setMessage("");
    try {
      if (action === "hard-delete" && !confirm("Permanently delete this template? Only allowed if no orders reference it.")) {
        return;
      }
      const res = await fetch("/api/admin/invitation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(d.error || "Action failed");
        return;
      }
      setMessage(
        action === "duplicate"
          ? "Template duplicated (inactive draft)."
          : action === "archive"
            ? "Template archived."
            : action === "restore"
              ? "Template restored."
              : "Template deleted."
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveCreativeOverride() {
    if (!creativeSlug) return;
    setBusyId(creativeSlug);
    const res = await fetch("/api/admin/invitation-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "creative-override",
        override: {
          catalogSlug: creativeSlug,
          ...creative,
          motionProfile: creative.motionProfile || undefined,
          parallaxProfile: creative.parallaxProfile || undefined,
        },
      }),
    });
    const d = await res.json();
    setBusyId(null);
    if (d.success) {
      setUniqueness((prev) => ({ ...prev, [creativeSlug]: d.data.report }));
      setMessage(`Creative override saved for ${creativeSlug} (internal uniqueness ${d.data.report.score}/100).`);
    } else {
      setMessage(d.error || "Override failed");
    }
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Invitation Catalogue Templates"
        subtitle="Create, archive, duplicate, feature — uniqueness scores are internal only"
        count={templates.length}
        onRefresh={load}
        onAdd={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
        addLabel="Create Template"
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/admin/audit-logs"
          className="inline-flex items-center gap-1.5 text-[#0B8A83] hover:underline"
        >
          <ScrollText className="h-4 w-4" />
          Audit logs
        </Link>
        <Link href="/admin/music" className="text-slate-600 hover:text-[#0B8A83] hover:underline">
          Sound library
        </Link>
        <span className="text-slate-400">·</span>
        <span className="text-xs text-slate-500">
          Invitation catalogue lives here. Legacy /admin/templates remains for design-engine SKUs only.
        </span>
      </div>

      {message && <p className="text-sm text-[#0B8A83]">{message}</p>}

      {showForm && (
        <Card key={editId ?? "new"}>
          <CardContent className="pt-6 grid sm:grid-cols-2 gap-4">
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editId} /></div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Style</Label><Input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} /></div>
            <div><Label>Layout Slug</Label><Input value={form.layoutSlug} onChange={(e) => setForm({ ...form, layoutSlug: e.target.value })} /></div>
            <div><Label>Price GHS (0 = free)</Label><Input type="number" value={form.priceGhs} onChange={(e) => setForm({ ...form, priceGhs: parseFloat(e.target.value) })} /></div>
            <div className="sm:col-span-2">
              <Label>Preview image</Label>
              <ImageUploadCropper
                defaultAspect="free"
                uploadEndpoint="/api/admin/invitation-templates/upload"
                extraFormFields={{ category: "preview" }}
                buttonLabel="Import preview image"
                previewUrl={form.previewImageUrl || null}
                onClear={() => setForm({ ...form, previewImageUrl: "" })}
                onUploaded={(r) => setForm({ ...form, previewImageUrl: r.url })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Background image</Label>
              <ImageUploadCropper
                defaultAspect="free"
                uploadEndpoint="/api/admin/invitation-templates/upload"
                extraFormFields={{ category: "background" }}
                buttonLabel="Import background image"
                previewUrl={form.backgroundImageUrl || null}
                onClear={() => setForm({ ...form, backgroundImageUrl: "" })}
                onUploaded={(r) => setForm({ ...form, backgroundImageUrl: r.url })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Inspiration media (image)</Label>
              <ImageUploadCropper
                defaultAspect="free"
                uploadEndpoint="/api/admin/invitation-templates/upload"
                extraFormFields={{ category: "inspiration" }}
                buttonLabel="Import inspiration artwork"
                previewUrl={form.inspirationMediaUrl || null}
                onClear={() => setForm({ ...form, inspirationMediaUrl: "" })}
                onUploaded={(r) => setForm({ ...form, inspirationMediaUrl: r.url })}
              />
            </div>
            <div><Label>Event Types (comma-separated)</Label><Input value={form.eventTypes} onChange={(e) => setForm({ ...form, eventTypes: e.target.value })} placeholder="WEDDING,FUNERAL" /></div>
            <div><Label>Package Availability</Label><Input value={form.packageSlugs} onChange={(e) => setForm({ ...form, packageSlugs: e.target.value })} placeholder="starter,celebration" /></div>
            <div><Label>Languages (comma-separated)</Label><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="en,fr" /></div>
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4 border-t pt-4">
              <TemplateMediaUpload
                label="Upload preview video"
                category="preview"
                accept="video/*"
                previewUrl={form.previewVideoUrl || null}
                onClear={() => setForm({ ...form, previewVideoUrl: "" })}
                onUploaded={(url) => setForm({ ...form, previewVideoUrl: url })}
              />
              <TemplateMediaUpload
                label="Upload background video"
                category="background"
                accept="video/*"
                previewUrl={form.backgroundVideoUrl || null}
                onClear={() => setForm({ ...form, backgroundVideoUrl: "" })}
                onUploaded={(url) => setForm({ ...form, backgroundVideoUrl: url })}
              />
              <TemplateMediaUpload
                label="Upload motion reference"
                category="motion"
                accept="video/*"
                previewUrl={form.motionReferenceUrl || null}
                onClear={() => setForm({ ...form, motionReferenceUrl: "" })}
                onUploaded={(url) => setForm({ ...form, motionReferenceUrl: url })}
              />
            </div>
            <div className="sm:col-span-2 border-t pt-4">
              <GalleryUploadPanel
                title="Default gallery media"
                description="Photos and videos shown when guests have not uploaded their own gallery yet. Each template can have a unique default set."
                urls={form.defaultGalleryUrls}
                onChange={(urls) => setForm({ ...form, defaultGalleryUrls: urls })}
                maxImages={12}
                uploadEndpoint="/api/admin/invitation-templates/upload"
                extraFormFields={{ category: "gallery" }}
              />
            </div>
            {editId && form.slug && uniqueness[form.slug] && (
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#0B8A83]" />
                  Internal uniqueness score: {uniqueness[form.slug].score}/100
                </p>
                <p className="text-xs text-slate-500">Not shown on public catalogue. Gate threshold ~70.</p>
                {uniqueness[form.slug].overlapping.length > 0 && (
                  <ul className="text-xs text-amber-700 list-disc pl-4">
                    {uniqueness[form.slug].overlapping.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (published)</label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={save}>Save Template</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {creativeSlug && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Creative assignment — {creativeSlug}</h3>
              <Button size="sm" variant="ghost" onClick={() => setCreativeSlug(null)}>Close</Button>
            </div>
            <p className="text-xs text-slate-500">
              Assign reveal, motion, parallax, typography, button family, and audio identity. Stored as app-level overrides (no migration). Permanent DNA still lives in template-creative-registry.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Opening / reveal</Label>
                <Select
                  value={creative.openingExperience || "__none__"}
                  onValueChange={(v) =>
                    setCreative({
                      ...creative,
                      openingExperience: v === "__none__" ? "" : v,
                      revealMechanic: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Unset</SelectItem>
                    {OPENING_EXPERIENCES.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Motion profile</Label>
                <Select
                  value={creative.motionProfile || "__none__"}
                  onValueChange={(v) =>
                    setCreative({ ...creative, motionProfile: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unset</SelectItem>
                    {MOTION_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Parallax</Label>
                <Select
                  value={creative.parallaxProfile || "moderate"}
                  onValueChange={(v) => setCreative({ ...creative, parallaxProfile: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARALLAX_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Typography system</Label>
                <Select
                  value={creative.typographySystem || "__none__"}
                  onValueChange={(v) =>
                    setCreative({ ...creative, typographySystem: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Unset</SelectItem>
                    {TYPOGRAPHY_PACKS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Button family</Label>
                <Select
                  value={creative.buttonFamily || "__none__"}
                  onValueChange={(v) =>
                    setCreative({ ...creative, buttonFamily: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Unset</SelectItem>
                    {EXTENDED_BUTTON_STYLES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Scene transition</Label>
                <Select
                  value={creative.sceneTransition || "fade"}
                  onValueChange={(v) => setCreative({ ...creative, sceneTransition: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCENE_TRANSITIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Outro type</Label>
                <Select
                  value={creative.outroType || "__none__"}
                  onValueChange={(v) =>
                    setCreative({ ...creative, outroType: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Unset</SelectItem>
                    {OUTRO_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Default audio track id</Label>
                <Input
                  value={creative.defaultAudioTrack}
                  onChange={(e) => setCreative({ ...creative, defaultAudioTrack: e.target.value })}
                  placeholder="Library track id"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea value={creative.notes} onChange={(e) => setCreative({ ...creative, notes: e.target.value })} />
              </div>
            </div>
            {uniqueness[creativeSlug] && (
              <p className="text-sm">
                Uniqueness: <strong>{uniqueness[creativeSlug].score}/100</strong>
                {uniqueness[creativeSlug].hasAdminOverride ? " · override active" : ""}
              </p>
            )}
            <Button onClick={() => void saveCreativeOverride()} disabled={busyId === creativeSlug}>
              Save creative assignment
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className={!t.isActive ? "opacity-60" : ""}>
            <CardContent className="pt-5 space-y-3">
              <div className={`h-24 rounded-xl bg-gradient-to-br ${t.previewGradient ?? "from-[#0B8A83] to-[#0F172A]"}`} />
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{t.name}</p>
                {t.isFeatured && <Badge className="bg-[#D4A63A] text-[#0F172A]"><Star className="h-3 w-3" /> Featured</Badge>}
                {!t.isActive && <Badge variant="outline">Archived</Badge>}
              </div>
              <p className="text-xs text-slate-500">{t.category} · {t.style} · {t.slug}</p>
              {uniqueness[t.slug] && (
                <p className="text-[11px] text-slate-500">Uniqueness {uniqueness[t.slug].score}/100</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === t.id}
                  onClick={() => {
                    setCreativeSlug(t.slug);
                    void loadUniqueness(t.slug);
                  }}
                >
                  <Shield className="h-3 w-3" /> Creative
                </Button>
                <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => void runAction(t.id, "duplicate")}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggle(t.id, "isFeatured", !t.isFeatured)}>
                  <Star className="h-3 w-3" />
                </Button>
                {t.isActive ? (
                  <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => void runAction(t.id, "archive")}>
                    <Archive className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => void runAction(t.id, "restore")}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => toggle(t.id, "isActive", !t.isActive)}>
                  {t.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="destructive" disabled={busyId === t.id} onClick={() => void runAction(t.id, "hard-delete")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />

      <AdminInvitationExperienceControls />
    </div>
  );
}
