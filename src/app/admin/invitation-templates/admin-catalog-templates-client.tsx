"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Eye, EyeOff } from "lucide-react";
import { TemplateMediaUpload } from "@/components/admin/template-media-upload";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";
import { AdminInvitationExperienceControls } from "./admin-invitation-experience-controls";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

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

const emptyForm = {
  slug: "", name: "", description: "", category: "Wedding", style: "Luxury",
  layoutSlug: "classic-gold", previewGradient: "", previewImageUrl: "", previewVideoUrl: "",
  backgroundImageUrl: "", backgroundVideoUrl: "", motionReferenceUrl: "", inspirationMediaUrl: "",
  defaultGalleryUrls: [] as string[],
  eventTypes: "WEDDING,BIRTHDAY", packageSlugs: "starter,celebration,signature",
  priceGhs: 0, languages: "en,fr", isPremium: false, isFeatured: false, isActive: true,
};

export function AdminCatalogTemplatesClient() {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Invitation Catalogue Templates"
        subtitle="Manage MVP invitation templates — preview media, pricing, languages"
        count={templates.length}
        onRefresh={load}
        onAdd={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
        addLabel="Create Template"
      />

      {showForm && (
        <Card>
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
                defaultAspect="3:4"
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
                defaultAspect="3:4"
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
                defaultAspect="4:5"
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
              <TemplateMediaUpload label="Upload preview video" category="preview" accept="video/*" onUploaded={(url) => setForm({ ...form, previewVideoUrl: url })} />
              <TemplateMediaUpload label="Upload background video" category="background" accept="video/*" onUploaded={(url) => setForm({ ...form, backgroundVideoUrl: url })} />
              <TemplateMediaUpload label="Upload motion reference" category="motion" accept="video/*" onUploaded={(url) => setForm({ ...form, motionReferenceUrl: url })} />
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
            <div className="sm:col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={save}>Save Template</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
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
                {!t.isActive && <Badge variant="outline">Disabled</Badge>}
              </div>
              <p className="text-xs text-slate-500">{t.category} · {t.style}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(t.id, "isFeatured", !t.isFeatured)}>
                  <Star className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggle(t.id, "isActive", !t.isActive)}>
                  {t.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
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
