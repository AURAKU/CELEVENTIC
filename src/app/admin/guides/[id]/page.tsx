"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { parseJsonStringArray } from "@/lib/celeventic-guide/sanitize";

type StepForm = { title: string; body: string; stepType: string; sortOrder: number };

export default function AdminGuideEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    body: "",
    role: "ORGANIZER",
    category: "PLATFORM",
    status: "DRAFT",
    sortOrder: 0,
    featured: false,
    adminOnly: false,
    posterUrl: "",
    videoUrl: "",
    captionsEnUrl: "",
    captionsFrUrl: "",
    storyboardKey: "",
    transcript: "",
    synonyms: "",
    relatedSlugs: "",
    contextRoutes: "",
    ogTitle: "",
    ogDescription: "",
    steps: [] as StepForm[],
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/guides/${params.id}`);
      const data = await res.json();
      const g = data.guide;
      if (!g) {
        setLoading(false);
        return;
      }
      setForm({
        title: g.title ?? "",
        slug: g.slug ?? "",
        summary: g.summary ?? "",
        body: g.body ?? "",
        role: g.role ?? "ORGANIZER",
        category: g.category ?? "PLATFORM",
        status: g.status ?? "DRAFT",
        sortOrder: g.sortOrder ?? 0,
        featured: !!g.featured,
        adminOnly: !!g.adminOnly,
        posterUrl: g.posterUrl ?? "",
        videoUrl: g.videoUrl ?? "",
        captionsEnUrl: g.captionsEnUrl ?? "",
        captionsFrUrl: g.captionsFrUrl ?? "",
        storyboardKey: g.storyboardKey ?? "",
        transcript: g.transcript ?? "",
        synonyms: parseJsonStringArray(g.synonyms).join(", "),
        relatedSlugs: parseJsonStringArray(g.relatedSlugs).join(", "),
        contextRoutes: parseJsonStringArray(g.contextRoutes).join(", "),
        ogTitle: g.ogTitle ?? "",
        ogDescription: g.ogDescription ?? "",
        steps: (g.steps ?? []).map((s: StepForm & { sortOrder: number }, i: number) => ({
          title: s.title,
          body: s.body,
          stepType: s.stepType || "motion",
          sortOrder: s.sortOrder ?? i,
        })),
      });
      setLoading(false);
    })();
  }, [params.id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        posterUrl: form.posterUrl || null,
        videoUrl: form.videoUrl || null,
        captionsEnUrl: form.captionsEnUrl || null,
        captionsFrUrl: form.captionsFrUrl || null,
        storyboardKey: form.storyboardKey || null,
        synonyms: form.synonyms.split(",").map((s) => s.trim()).filter(Boolean),
        relatedSlugs: form.relatedSlugs.split(",").map((s) => s.trim()).filter(Boolean),
        contextRoutes: form.contextRoutes.split(",").map((s) => s.trim()).filter(Boolean),
        steps: form.steps,
      };
      await fetch(`/api/admin/guides/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Edit guide" subtitle={form.slug} />
      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/guide/${form.slug}`} target="_blank">
            Preview
          </Link>
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/guides">Back</Link>
        </Button>
      </div>

      <Field label="Title">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Slug">
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      </Field>
      <Field label="Summary">
        <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} />
      </Field>
      <Field label="Body">
        <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Role">
          <select
            className="w-full rounded-md border border-slate-200 px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {["GUEST", "ORGANIZER", "VENDOR", "SCANNER", "ADMIN"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <Field label="Status">
          <select
            className="w-full rounded-md border border-slate-200 px-3 py-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.adminOnly}
          onChange={(e) => setForm({ ...form, adminOnly: e.target.checked })}
        />
        Admin only (never public)
      </label>

      <Field label="Poster URL">
        <Input value={form.posterUrl} onChange={(e) => setForm({ ...form, posterUrl: e.target.value })} />
      </Field>
      <Field label="Video URL (optional — leave empty until recorded)">
        <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
      </Field>
      <Field label="Captions EN URL">
        <Input value={form.captionsEnUrl} onChange={(e) => setForm({ ...form, captionsEnUrl: e.target.value })} />
      </Field>
      <Field label="Captions FR URL">
        <Input value={form.captionsFrUrl} onChange={(e) => setForm({ ...form, captionsFrUrl: e.target.value })} />
      </Field>
      <Field label="Storyboard key">
        <Input value={form.storyboardKey} onChange={(e) => setForm({ ...form, storyboardKey: e.target.value })} />
      </Field>
      <Field label="Transcript">
        <Textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={4} />
      </Field>
      <Field label="Synonyms (comma-separated)">
        <Input value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} />
      </Field>
      <Field label="Related slugs (comma-separated)">
        <Input value={form.relatedSlugs} onChange={(e) => setForm({ ...form, relatedSlugs: e.target.value })} />
      </Field>
      <Field label="Context routes (comma-separated)">
        <Input value={form.contextRoutes} onChange={(e) => setForm({ ...form, contextRoutes: e.target.value })} />
      </Field>
      <Field label="OG title">
        <Input value={form.ogTitle} onChange={(e) => setForm({ ...form, ogTitle: e.target.value })} />
      </Field>
      <Field label="OG description">
        <Textarea value={form.ogDescription} onChange={(e) => setForm({ ...form, ogDescription: e.target.value })} rows={2} />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Steps</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setForm({
                ...form,
                steps: [...form.steps, { title: "New step", body: "", stepType: "motion", sortOrder: form.steps.length }],
              })
            }
          >
            Add step
          </Button>
        </div>
        {form.steps.map((step, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <Input
              value={step.title}
              onChange={(e) => {
                const steps = [...form.steps];
                steps[i] = { ...step, title: e.target.value };
                setForm({ ...form, steps });
              }}
              placeholder="Step title"
            />
            <Textarea
              value={step.body}
              onChange={(e) => {
                const steps = [...form.steps];
                steps[i] = { ...step, body: e.target.value };
                setForm({ ...form, steps });
              }}
              rows={2}
            />
            <div className="flex gap-2">
              <select
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                value={step.stepType}
                onChange={(e) => {
                  const steps = [...form.steps];
                  steps[i] = { ...step, stepType: e.target.value };
                  setForm({ ...form, steps });
                }}
              >
                <option value="motion">motion</option>
                <option value="tip">tip</option>
                <option value="warning">warning</option>
                <option value="checklist">checklist</option>
              </select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
