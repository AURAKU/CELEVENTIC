"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemplateCanvas } from "@/components/template-engine/template-canvas";
import type { TemplateBlock, TemplateCanvas as CanvasType } from "@/types/template-engine";
import { Store, Heart, ArrowLeft, Check } from "lucide-react";

interface MarketplaceTemplate {
  id: string;
  name: string;
  category: string;
  style: string;
  isPremium: boolean;
  price: number;
  isFeatured: boolean;
  canvas: CanvasType;
  blocks: TemplateBlock[];
  _count: { purchases: number; favorites: number };
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [purchased, setPurchased] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/design-templates/marketplace").then((r) => r.json()),
      fetch("/api/design-templates/favorites").then((r) => r.json()),
    ]).then(([market, fav]) => {
      if (market.success) setTemplates(market.data);
      if (fav.success) setFavorites(new Set(fav.data.map((f: { templateId: string }) => f.templateId)));
    });
  }, []);

  async function purchase(id: string, isPremium: boolean) {
    const res = await fetch("/api/design-templates/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purchase", templateId: id }),
    });
    const d = await res.json();
    if (res.ok) {
      setPurchased((prev) => new Set([...prev, id]));
      alert(d.data.free ? "Free template unlocked!" : "Purchase successful — template unlocked!");
    } else {
      alert(d.error);
    }
  }

  async function favorite(id: string) {
    const res = await fetch("/api/design-templates/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "favorite", templateId: id }),
    });
    const d = await res.json();
    if (res.ok) {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (d.data.favorited) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/design-studio"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="page-heading flex items-center gap-2">
            <Store className="h-6 w-6 text-brand-600" /> Template Marketplace
          </h1>
          <p className="page-subtitle">Free & premium templates from Celeventic designers</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => {
          const owned = purchased.has(t.id) || !t.isPremium;
          const isFav = favorites.has(t.id);
          return (
            <Card key={t.id} className="card-glow">
              <div className="bg-mesh p-3 flex justify-center">
                <TemplateCanvas canvas={t.canvas} blocks={t.blocks} scale={0.16} />
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-slate-500">{t.category} · {t.style}</p>
                  </div>
                  {t.isPremium ? <Badge variant="secondary">GHS {t.price}</Badge> : <Badge variant="outline">Free</Badge>}
                </div>
                {t.isFeatured && <Badge className="text-xs">Featured</Badge>}
                <p className="text-xs text-slate-500">{t._count.purchases} purchases · {t._count.favorites} favorites</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" onClick={() => purchase(t.id, t.isPremium)} disabled={owned}>
                    {owned ? <><Check className="h-3 w-3" /> Owned</> : t.isPremium ? "Buy" : "Use Free"}
                  </Button>
                  <Button
                    size="sm"
                    variant={isFav ? "default" : "outline"}
                    onClick={() => favorite(t.id)}
                  >
                    <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/design-studio/builder/${t.id}`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
