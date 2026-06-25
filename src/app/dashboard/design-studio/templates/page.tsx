"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateCanvas } from "@/components/template-engine/template-canvas";
import { TEMPLATE_CATEGORIES } from "@/lib/template-constants";
import type { TemplateBlock, TemplateCanvas as CanvasType } from "@/types/template-engine";
import { Sparkles, ArrowLeft, Lock, Star } from "lucide-react";

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  style: string;
  productType: string;
  isPremium: boolean;
  price: number;
  isFeatured: boolean;
  canvas: CanvasType;
  blocks: TemplateBlock[];
  recommendReason?: string;
  matchScore?: number;
}

export default function TemplateLibraryPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading templates…</p>}>
      <TemplateLibraryPageInner />
    </Suspense>
  );
}

function TemplateLibraryPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [recommended, setRecommended] = useState<DesignTemplate[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState("");

  useEffect(() => {
    const url = new URL("/api/design-templates", window.location.origin);
    if (category) url.searchParams.set("category", category);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => { if (d.success) setTemplates(d.data); })
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const event = d.data;
        return fetch("/api/design-templates/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: event.eventType,
            guestCount: event.expectedGuests,
            packageSlug: event.package?.slug,
          }),
        });
      })
      .then((r) => r?.json())
      .then((d) => { if (d?.success) setRecommended(d.data); });
  }, [eventId]);

  useEffect(() => {
    fetch("/api/design-templates/marketplace")
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.success) return;
        const owned = new Set<string>();
        for (const t of d.data) {
          if (!t.isPremium) owned.add(t.id);
        }
        const favRes = await fetch("/api/design-templates/favorites");
        const favData = await favRes.json();
        setOwnedIds(owned);
      });
  }, []);

  async function purchaseAndGenerate(templateId: string, isPremium: boolean) {
    if (isPremium && !ownedIds.has(templateId)) {
      const res = await fetch("/api/design-templates/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purchase", templateId }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? "Purchase required"); return; }
      setOwnedIds((prev) => new Set([...prev, templateId]));
    }
    await generateDesigns(templateId);
  }

  async function generateDesigns(templateId: string) {
    if (!eventId) { router.push("/dashboard/design-studio"); return; }
    setGenerating(templateId);
    const res = await fetch("/api/design-templates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, templateId }),
    });
    const d = await res.json();
    setGenerating("");
    if (res.ok) {
      router.push(`/dashboard/design-studio/generated?eventId=${eventId}`);
    } else {
      alert(d.error ?? "Generation failed");
    }
  }

  function TemplateCard({ t, showReason }: { t: DesignTemplate; showReason?: boolean }) {
    const locked = t.isPremium && !ownedIds.has(t.id);
    return (
      <Card className="overflow-hidden card-glow hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)]">
        <div className="bg-slate-100 p-4 flex justify-center">
          <TemplateCanvas canvas={t.canvas} blocks={t.blocks} scale={0.18} />
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold">{t.name}</h3>
              <p className="text-xs text-slate-500">{t.category} · {t.style}</p>
            </div>
            {t.isPremium ? (
              <Badge variant="secondary">GHS {t.price}</Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
          {t.isFeatured && <Badge className="text-xs">Featured</Badge>}
          {showReason && t.recommendReason && (
            <p className="text-xs text-brand-600 flex items-center gap-1">
              <Star className="h-3 w-3" /> {t.recommendReason}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => purchaseAndGenerate(t.id, t.isPremium)}
              disabled={!!generating}
            >
              {locked && <Lock className="h-3 w-3" />}
              {generating === t.id
                ? "Generating..."
                : locked
                ? `Buy & Generate`
                : eventId
                ? "Generate Suite"
                : "Select Event First"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/design-studio/builder/${t.id}`}>Edit</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/design-studio"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="page-heading flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-600" /> Template Library
          </h1>
          <p className="page-subtitle">Curated JSON-based editable templates — generate full design suites</p>
        </div>
      </div>

      {recommended.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-gold-500" /> Recommended for Your Event
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommended.map((t) => <TemplateCard key={`rec-${t.id}`} t={t} showReason />)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-12">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No templates yet. Run database seed.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => <TemplateCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
